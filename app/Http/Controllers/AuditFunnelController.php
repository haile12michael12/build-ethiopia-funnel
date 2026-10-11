<?php

namespace App\Http\Controllers;

use App\Actions\Leads\CaptureLead;
use App\Http\Requests\StoreBusinessAuditRequest;
use App\Http\Resources\BusinessAuditResource;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class AuditFunnelController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('audit/business-growth', [
            'options' => config('business-audit.options'),
        ]);
    }

    public function store(StoreBusinessAuditRequest $request, CaptureLead $captureLead): RedirectResponse
    {
        $ownerId = config('business-audit.owner_id');
        $owner = is_numeric($ownerId) ? User::query()->find($ownerId) : null;

        abort_unless($owner, 503, 'Business audit submissions are not configured. Set BUSINESS_AUDIT_OWNER_ID to an existing account id.');

        $result = $captureLead->handle(
            $owner,
            $request->validated(),
            $request,
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
