<?php

namespace App\Http\Controllers;

use App\Actions\Leads\CaptureLead;
use App\Http\Requests\StoreBusinessAuditRequest;
use App\Http\Resources\BusinessAuditResource;
use App\Models\Activity;
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
        $owner = User::configuredLeadOwner();

        abort_unless($owner, 503, 'Business audit submissions are not configured. Set ADMIN_EMAIL or BUSINESS_AUDIT_OWNER_ID to the business owner account.');

        $result = $captureLead->handle(
            $owner,
            $request->validated(),
            $request,
        );
        Activity::record('lead_submitted', $result['contact']->customer_user_id, $result['contact'], ['source' => 'business-growth-audit']);

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
