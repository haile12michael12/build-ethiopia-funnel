<?php

namespace App\Http\Controllers;

use App\Actions\Leads\CaptureLead;
use App\Http\Requests\StoreBusinessAuditRequest;
use App\Http\Resources\BusinessAuditResource;
use App\Models\Contact;
use App\Models\User;
use App\Services\SiteEventRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class AuditFunnelController extends Controller
{
    public function show(): Response
    {
        $locale = app()->getLocale();
        $options = collect(config('business-audit.options'))
            ->map(fn (array $group): array => array_map(static function (array $option) use ($locale): array {
                if ($locale === 'am' && filled($option['label_am'] ?? null)) {
                    $option['label'] = $option['label_am'];
                }
                unset($option['label_am']);

                return $option;
            }, $group))
            ->all();

        return Inertia::render('audit/business-growth', [
            'options' => $options,
        ]);
    }

    public function store(StoreBusinessAuditRequest $request, CaptureLead $captureLead, SiteEventRecorder $events): RedirectResponse
    {
        $ownerId = config('business-audit.owner_id');
        $owner = is_numeric($ownerId) ? User::query()->find($ownerId) : null;

        abort_unless($owner, 503, 'Business audit submissions are not configured. Set BUSINESS_AUDIT_OWNER_ID to an existing account id.');

        $result = $captureLead->handle(
            $owner,
            $request->validated(),
            $request,
        );

        $events->record(
            'audit_completed',
            $request,
            ['market' => data_get($result['contact']->business_audit, 'market')],
            $request->string('session_id')->trim()->value(),
        );

        return redirect()->to(URL::temporarySignedRoute(
            'business-audit.thank-you',
            now()->addMinutes(30),
            ['contact' => $result['contact']->id],
        ));
    }

    public function thankYou(Contact $contact): Response
    {
        return Inertia::render('audit/thank-you', [
            'audit' => (new BusinessAuditResource($contact))->resolve(),
        ]);
    }
}
