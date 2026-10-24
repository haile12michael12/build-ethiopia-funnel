<?php

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    test()->withoutVite();
});

function createWorkspaceForSettings(User $owner): Workspace
{
    $workspace = Workspace::query()->create([
        'owner_id' => $owner->id,
        'name' => 'Agency Workspace',
        'slug' => 'agency-workspace-'.uniqid(),
    ]);
    $workspace->members()->attach($owner->id, ['role' => 'owner']);

    return $workspace;
}

test('workspace owners can edit workspace identity and regional defaults', function () {
    $owner = User::factory()->create();
    $workspace = createWorkspaceForSettings($owner);

    $this->actingAs($owner)
        ->get(route('workspaces.settings.edit', $workspace))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('workspaces/settings')
            ->where('workspace.name', 'Agency Workspace')
            ->where('workspace.language', 'en')
            ->where('workspace.currency', 'ETB'));

    $this->actingAs($owner)->put(route('workspaces.settings.update', $workspace), [
        'name' => 'Updated Agency',
        'description' => 'A software and automation studio.',
        'type' => 'agency',
        'country' => 'ET',
        'language' => 'am',
        'timezone' => 'Africa/Addis_Ababa',
        'market' => 'ethiopia',
        'currency' => 'ETB',
    ])->assertRedirect(route('workspaces.settings.edit', $workspace));

    expect($workspace->fresh()->name)->toBe('Updated Agency')
        ->and($workspace->fresh()->language)->toBe('am')
        ->and($workspace->fresh()->country)->toBe('ET');
});

test('workspace settings are limited to authorized members and valid regional values', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $workspace = createWorkspaceForSettings($owner);
    $workspace->members()->attach($member->id, ['role' => 'editor']);
    config(['business.owner_email' => $owner->email]);

    $this->actingAs($member)->get(route('workspaces.settings.edit', $workspace))->assertForbidden();
    $this->actingAs($member)->put(route('workspaces.settings.update', $workspace), [
        'name' => 'Unauthorized Change',
        'type' => 'agency',
        'country' => 'ET',
        'language' => 'en',
        'timezone' => 'UTC',
        'market' => 'ethiopia',
        'currency' => 'ETB',
    ])->assertForbidden();

    $this->actingAs($owner)->from(route('workspaces.settings.edit', $workspace))
        ->put(route('workspaces.settings.update', $workspace), [
            'name' => 'Agency Workspace',
            'type' => 'agency',
            'country' => 'ET',
            'language' => 'fr',
            'timezone' => 'Not/A_Timezone',
            'market' => 'ethiopia',
            'currency' => 'ETB',
        ])->assertSessionHasErrors(['language', 'timezone']);

    expect($workspace->fresh()->name)->toBe('Agency Workspace');
});
