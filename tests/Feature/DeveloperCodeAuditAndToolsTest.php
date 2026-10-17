<?php

use App\Jobs\CalculateLeadScore;
use App\Mail\DeveloperAuditUnlockMail;
use App\Models\Contact;
use App\Models\DeveloperAuditReport;
use App\Models\FunnelEvent;
use App\Models\User;
use App\Services\DeveloperProductSignalRecorder;
use App\Services\DeveloperStarterExportService;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use ZipArchive;

uses(RefreshDatabase::class);

function developerAuditZip(array $files): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'developer-audit-test-');
    if ($path === false) {
        throw new RuntimeException('Could not create a temporary archive.');
    }

    $zip = new ZipArchive;
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException('Could not create a ZIP archive.');
    }
    foreach ($files as $name => $contents) {
        $zip->addFromString($name, $contents);
    }
    $zip->close();

    return new UploadedFile($path, 'project.zip', 'application/zip', null, true);
}

function configuredAuditOwner(): User
{
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    return $owner;
}

test('developer audit pages render and valid ZIP submissions store findings but not source contents', function () {
    $this->withoutVite();
    Mail::fake();
    $owner = configuredAuditOwner();
    $upload = developerAuditZip([
        'src/app.js' => "eval(input);\n",
        '.env' => "API_KEY=private-source-secret-9911\n",
    ]);

    try {
        $this->get(route('developer-audit.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('developer-audit/index'));

        $this->post(route('developer-audit.store'), [
            'email' => 'developer@example.com',
            'archive' => $upload,
        ])->assertRedirect(route('developer-audit.check-email'));

        $report = DeveloperAuditReport::query()->firstOrFail();
        $serializedReport = json_encode($report->report, JSON_THROW_ON_ERROR);

        expect($report->user_id)->toBe($owner->id)
            ->and($report->email)->toBe('developer@example.com')
            ->and($report->report['files_analyzed'])->toBe(1)
            ->and($report->report['files_skipped'])->toBe(1)
            ->and($report->report['findings'])->toHaveCount(2)
            ->and($serializedReport)->not->toContain('private-source-secret-9911')
            ->and($report->token_hash)->not->toBeEmpty();

        Mail::assertQueued(DeveloperAuditUnlockMail::class);
    } finally {
        @unlink($upload->getPathname());
    }
});

test('email unlock grants only a session-bound report view and expires after seven days', function () {
    $this->withoutVite();
    Mail::fake();
    configuredAuditOwner();
    $upload = developerAuditZip(['src/app.ts' => 'export const ready = true;']);
    try {
        $this->post(route('developer-audit.store'), [
            'email' => 'unlock@example.com',
            'archive' => $upload,
        ])->assertRedirect();
    } finally {
        @unlink($upload->getPathname());
    }

    $report = DeveloperAuditReport::query()->firstOrFail();
    $unlockUrl = null;
    Mail::assertQueued(DeveloperAuditUnlockMail::class, function (DeveloperAuditUnlockMail $mail) use (&$unlockUrl, $report): bool {
        $unlockUrl = $mail->unlockUrl;

        return str_contains($mail->unlockUrl, $report->public_id)
            && str_contains($mail->unlockUrl, 'signature=');
    });

    expect($unlockUrl)->toBeString();
    $this->get($unlockUrl)
        ->assertRedirect(route('developer-audit.report', ['audit' => $report->public_id]));
    $this->get(route('developer-audit.report', ['audit' => $report->public_id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer-audit/report')
            ->where('report.score', 100)
            ->where('report.files_analyzed', 1));

    $report->update(['expires_at' => now()->subSecond()]);
    $this->get(route('developer-audit.report', ['audit' => $report->public_id]))->assertNotFound();
});

test('audit rejects ZIP traversal paths and invalid archives without storing a report', function () {
    configuredAuditOwner();
    $upload = developerAuditZip([
        '../outside.php' => '<?php echo "unsafe";',
        'src/app.php' => '<?php echo "safe";',
    ]);

    try {
        $this->from(route('developer-audit.index'))
            ->post(route('developer-audit.store'), [
                'email' => 'unsafe@example.com',
                'archive' => $upload,
            ])
            ->assertSessionHasErrors('archive');
    } finally {
        @unlink($upload->getPathname());
    }

    expect(DeveloperAuditReport::query()->count())->toBe(0);
});

test('product signals deduplicate per audit and their queued scoring rules update the existing score bands', function () {
    $owner = configuredAuditOwner();
    $contact = $owner->contacts()->create([
        'email' => 'signals@example.com',
        'source' => 'developer_code_audit',
        'status' => 'new',
    ]);
    $signals = app(DeveloperProductSignalRecorder::class);
    $signals->record($contact, 'code_audit_completed', 42);
    $signals->record($contact, 'code_audit_completed', 42);
    $event = FunnelEvent::query()->where('event_type', 'code_audit_completed')->firstOrFail();

    (new CalculateLeadScore($event->id))->handle(app(App\Services\Automation\AutomationEventRecorder::class));

    expect(FunnelEvent::query()->where('event_type', 'code_audit_completed')->count())->toBe(1)
        ->and($contact->fresh()->lead_score)->toBe(20)
        ->and($contact->fresh()->metadata['lead_score_band'])->toBe('educational')
        ->and($event->fresh()->funnel_id)->toBeNull()
        ->and($event->fresh()->scored_at)->not->toBeNull();
});

test('playground is deterministic simulation and starter export contains only configured scaffolding', function () {
    $this->withoutVite();
    $this->postJson(route('developer-tools.playground'), [
        'stack' => 'laravel-react',
        'features' => ['forms', 'tests'],
    ])->assertOk()
        ->assertJsonPath('simulation.status', 'simulation_only')
        ->assertJsonPath('simulation.stack', 'laravel-react')
        ->assertJsonPath('simulation.selected_features.0', 'forms')
        ->assertJsonFragment(['No submitted or generated code was executed']);

    $files = app(DeveloperStarterExportService::class)->files('laravel-react', ['forms']);
    expect($files)->toHaveKey('composer.json')
        ->and($files)->toHaveKey('docs/forms.md')
        ->and($files)->not->toHaveKey('docs/auth.md')
        ->and($files['.env.example'])->toContain('replace-with-your-own-secret')
        ->and($files['.env.example'])->not->toContain('sk_live_');
});
