<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function importCsv(string $content): UploadedFile
{
    return UploadedFile::fake()->createWithContent('contacts.csv', $content);
}

function importPreviewToken(): string
{
    $files = Storage::disk('local')->files('contact-imports');

    expect($files)->not->toBeEmpty();

    return basename($files[0], '.csv');
}

test('csv preview detects columns and classifies duplicate and invalid rows', function () {
    Storage::fake('local');
    $this->withoutVite();
    $owner = User::factory()->create();
    $owner->contacts()->create(['email' => 'existing@example.com', 'name' => 'Existing']);

    $csv = implode("\n", [
        'Email,Full Name,Phone',
        'new@example.com,New Lead,+251911223344',
        'existing@example.com,Existing Lead,',
        'not-an-email,Broken Row,',
        'new@example.com,Duplicate In File,',
    ]);

    $this->actingAs($owner)
        ->withoutVite()
        ->post(route('contacts.import.preview'), ['file' => importCsv($csv)])
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('contacts-import')
            ->where('preview.mapping.email', 'email')
            ->where('preview.mapping.name', 'full_name')
            ->where('preview.mapping.phone', 'phone')
            ->where('preview.summary.total', 4)
            ->where('preview.summary.importable', 1)
            ->where('preview.summary.duplicates', 2)
            ->where('preview.summary.invalid', 1));
});

test('csv import creates contacts with normalized fields and skips invalid rows', function () {
    Storage::fake('local');
    $this->withoutVite();
    $owner = User::factory()->create();
    $funnel = $owner->funnels()->create([
        'name' => 'Spring Launch',
        'slug' => 'spring-launch',
        'content' => ['sections' => []],
        'settings' => ['backgroundColor' => '#ffffff', 'maxWidth' => '1200px'],
        'status' => 'draft',
        'is_published' => false,
    ]);

    $csv = implode("\n", [
        'email,name,phone,status,source,funnel,tags,company',
        'New.Lead@Example.com,New Lead,+251911223344,qualified,newsletter,Spring Launch,"vip, warm",Acme',
        'broken-email,Bad Row,,,,,',
    ]);

    $this->actingAs($owner)->post(route('contacts.import.preview'), ['file' => importCsv($csv)])->assertOk();
    $token = importPreviewToken();

    $this->actingAs($owner)
        ->withoutVite()
        ->post(route('contacts.import.store'), [
            'token' => $token,
            'mapping' => [
                'email' => 'email',
                'name' => 'name',
                'phone' => 'phone',
                'status' => 'status',
                'source' => 'source',
                'funnel' => 'funnel',
                'tags' => 'tags',
            ],
            'duplicate_strategy' => 'skip',
        ])
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('contacts-import')
            ->where('summary.created', 1)
            ->where('summary.invalid', 1)
            ->where('summary.skipped', 0));

    $contact = $owner->contacts()->where('email', 'new.lead@example.com')->firstOrFail();
    expect($contact->name)->toBe('New Lead')
        ->and($contact->status)->toBe('qualified')
        ->and($contact->source)->toBe('newsletter')
        ->and($contact->funnel_id)->toBe($funnel->id)
        ->and($contact->tags)->toBe(['vip', 'warm'])
        ->and(data_get($contact->metadata, 'imported_fields.company'))->toBe('Acme');

    $this->assertDatabaseHas('contact_activities', ['contact_id' => $contact->id, 'type' => 'imported']);
    expect(Storage::disk('local')->files('contact-imports'))->toBeEmpty();
});

test('duplicate emails can be skipped or updated based on the selected strategy', function () {
    Storage::fake('local');
    $this->withoutVite();
    $owner = User::factory()->create();
    $existing = $owner->contacts()->create([
        'email' => 'dup@example.com',
        'name' => 'Old Name',
        'status' => 'new',
    ]);

    $csv = implode("\n", [
        'email,name,status,source',
        'dup@example.com,New Name,contacted,referral',
        'dup@example.com,Again Name,,',
    ]);

    $this->actingAs($owner)->post(route('contacts.import.preview'), ['file' => importCsv($csv)])->assertOk();
    $token = importPreviewToken();

    $this->actingAs($owner)->post(route('contacts.import.store'), [
        'token' => $token,
        'mapping' => ['email' => 'email', 'name' => 'name', 'status' => 'status', 'source' => 'source'],
        'duplicate_strategy' => 'update',
    ])->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('summary.updated', 1)
        ->where('summary.skipped', 1)
        ->where('summary.created', 0));

    $existing->refresh();
    expect($existing->name)->toBe('New Name')
        ->and($existing->status)->toBe('contacted')
        ->and($existing->source)->toBe('referral');

    $this->actingAs($owner)->post(route('contacts.import.preview'), ['file' => importCsv($csv)])->assertOk();
    $secondToken = importPreviewToken();

    $this->actingAs($owner)->post(route('contacts.import.store'), [
        'token' => $secondToken,
        'mapping' => ['email' => 'email', 'name' => 'name'],
        'duplicate_strategy' => 'skip',
    ])->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('summary.updated', 0)
        ->where('summary.skipped', 2));

    expect($existing->fresh()->name)->toBe('New Name');
});

test('imports never touch another owners contacts with the same email', function () {
    Storage::fake('local');
    $this->withoutVite();
    $other = User::factory()->create();
    $foreign = $other->contacts()->create(['email' => 'shared@example.com', 'name' => 'Other Owner']);

    $owner = User::factory()->create();

    $csv = implode("\n", [
        'email,name',
        'shared@example.com,Owner Copy',
    ]);

    $this->actingAs($owner)->post(route('contacts.import.preview'), ['file' => importCsv($csv)])->assertOk();
    $token = importPreviewToken();

    $this->actingAs($owner)->post(route('contacts.import.store'), [
        'token' => $token,
        'mapping' => ['email' => 'email', 'name' => 'name'],
        'duplicate_strategy' => 'update',
    ])->assertOk()->assertInertia(fn (Assert $page) => $page->where('summary.created', 1));

    expect($foreign->fresh()->name)->toBe('Other Owner')
        ->and($owner->contacts()->where('email', 'shared@example.com')->value('name'))->toBe('Owner Copy');
});

test('import validation rejects missing files, wrong types, and unmapped emails', function () {
    Storage::fake('local');
    $this->withoutVite();
    $owner = User::factory()->create();

    $this->actingAs($owner)->post(route('contacts.import.preview'), [])->assertSessionHasErrors('file');
    $this->actingAs($owner)->post(route('contacts.import.preview'), [
        'file' => UploadedFile::fake()->create('contacts.pdf', 5, 'application/pdf'),
    ])->assertSessionHasErrors('file');

    $this->actingAs($owner)->post(route('contacts.import.store'), [
        'token' => (string) Str::uuid(),
        'mapping' => [],
        'duplicate_strategy' => 'skip',
    ])->assertSessionHasErrors('mapping');

    $this->actingAs($owner)->post(route('contacts.import.store'), [
        'token' => (string) Str::uuid(),
        'mapping' => ['email' => 'email'],
        'duplicate_strategy' => 'skip',
    ])->assertSessionHasErrors('file');
});

test('guest users cannot reach the contact import endpoints', function () {
    $this->get(route('contacts.import.create'))->assertRedirect(route('login'));
    $this->post(route('contacts.import.preview'))->assertRedirect(route('login'));
    $this->post(route('contacts.import.store'))->assertRedirect(route('login'));
});
