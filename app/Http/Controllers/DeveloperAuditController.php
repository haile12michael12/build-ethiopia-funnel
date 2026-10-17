<?php

namespace App\Http\Controllers;

use App\Mail\DeveloperAuditUnlockMail;
use App\Models\Contact;
use App\Models\DeveloperAuditReport;
use App\Models\User;
use App\Services\DeveloperCodeAuditAnalyzer;
use App\Services\DeveloperProductSignalRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DeveloperAuditController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('developer-audit/index');
    }

    public function store(
        Request $request,
        DeveloperCodeAuditAnalyzer $analyzer,
        DeveloperProductSignalRecorder $signals,
    ): RedirectResponse {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'archive' => ['required', 'file', 'mimes:zip', 'max:10240'],
        ]);

        $owner = User::query()->find(config('business-audit.owner_id'));
        abort_unless($owner, 503, 'Developer audit submissions are not configured. Set BUSINESS_AUDIT_OWNER_ID to an existing account id.');

        $report = $analyzer->analyzeZip($validated['archive']->getRealPath());
        $token = Str::random(64);
        $email = mb_strtolower($validated['email']);
        $audit = DB::transaction(function () use ($owner, $report, $token, $email): DeveloperAuditReport {
            $contact = Contact::query()->firstOrNew([
                'user_id' => $owner->id,
                'email' => $email,
            ]);
            $contact->fill([
                'name' => $contact->name,
                'source' => $contact->source ?: 'developer_code_audit',
                'status' => $contact->status ?: 'new',
                'metadata' => [
                    ...($contact->metadata ?? []),
                    'developer_code_audit_count' => (int) data_get($contact->metadata, 'developer_code_audit_count', 0) + 1,
                ],
                'last_submitted_at' => now(),
            ])->save();

            return DeveloperAuditReport::query()->create([
                'public_id' => (string) Str::uuid(),
                'user_id' => $owner->id,
                'contact_id' => $contact->id,
                'email' => $email,
                'token_hash' => hash('sha256', $token),
                'score' => $report['score'],
                'report' => $report,
                'expires_at' => now()->addDays(7),
            ]);
        });

        $signals->record($audit->contact, 'code_audit_completed', $audit->id);
        $unlockUrl = URL::temporarySignedRoute(
            'developer-audit.unlock',
            $audit->expires_at,
            ['audit' => $audit->public_id, 'token' => $token],
        );
        Mail::to($audit->email)->queue(new DeveloperAuditUnlockMail($unlockUrl, $audit->expires_at->toIso8601String()));

        return to_route('developer-audit.check-email');
    }

    public function checkEmail(): Response
    {
        return Inertia::render('developer-audit/check-email');
    }

    public function confirmUnlock(Request $request, DeveloperAuditReport $audit, string $token): Response
    {
        abort_unless($audit->expires_at->isFuture(), 404);
        abort_unless(hash_equals($audit->token_hash, hash('sha256', $token)), 404);

        return Inertia::render('developer-audit/confirm-unlock', [
            'confirmationUrl' => $request->fullUrl(),
        ]);
    }

    public function unlock(
        Request $request,
        DeveloperAuditReport $audit,
        string $token,
        DeveloperProductSignalRecorder $signals,
    ): RedirectResponse {
        abort_unless($audit->expires_at->isFuture(), 404);
        abort_unless(hash_equals($audit->token_hash, hash('sha256', $token)), 404);

        DB::transaction(function () use ($audit): void {
            $locked = DeveloperAuditReport::query()->lockForUpdate()->findOrFail($audit->id);
            if (! $locked->unlocked_at) {
                $locked->update(['unlocked_at' => now()]);
            }
        });

        $request->session()->put('developer_audit_report_id', $audit->id);
        $signals->record($audit->contact, 'code_audit_report_unlocked', $audit->id);

        return to_route('developer-audit.report', ['audit' => $audit->public_id]);
    }

    public function report(Request $request, DeveloperAuditReport $audit): Response
    {
        abort_unless(
            (int) $request->session()->get('developer_audit_report_id') === $audit->id
                && $audit->expires_at->isFuture()
                && $audit->unlocked_at !== null,
            404,
        );

        return Inertia::render('developer-audit/report', [
            'report' => [
                'score' => $audit->score,
                'files_analyzed' => $audit->report['files_analyzed'],
                'files_skipped' => $audit->report['files_skipped'],
                'findings' => $audit->report['findings'],
                'limitations' => $audit->report['limitations'],
                'expires_at' => $audit->expires_at->toISOString(),
            ],
        ]);
    }
}
