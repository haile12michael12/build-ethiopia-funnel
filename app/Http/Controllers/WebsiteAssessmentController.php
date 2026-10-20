<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\WebsiteAssessment;
use App\Services\ProspectWebsiteInspector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WebsiteAssessmentController extends Controller
{
    public function store(Request $request, Contact $contact): RedirectResponse
    {
        abort_unless($contact->user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'website_url' => ['required', 'string', 'max:500'],
            'has_website' => ['required', 'boolean'],
            'status' => ['required', Rule::in(WebsiteAssessment::STATUSES)],
            'mobile_usability_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'content_quality_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'technical_issues' => ['nullable', 'array'],
            'technical_issues.*' => ['string', 'max:255'],
            'suggested_improvements' => ['nullable', 'array'],
            'suggested_improvements.*' => ['string', 'max:255'],
            'evidence_url' => ['nullable', 'url', 'max:500'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['assessed_at'] = now();

        $contact->websiteAssessments()->create($validated);

        // Record in contact activities
        $contact->activities()->create([
            'type' => 'website_assessment_created',
            'description' => 'Recorded website assessment for '.$validated['website_url'],
            'metadata' => [
                'has_website' => $validated['has_website'],
                'mobile_score' => $validated['mobile_usability_score'] ?? null,
                'content_score' => $validated['content_quality_score'] ?? null,
            ],
            'created_at' => now(),
        ]);

        return back()->with('success', 'Website opportunity assessment saved.');
    }

    public function inspect(Request $request, Contact $contact, ProspectWebsiteInspector $inspector): JsonResponse
    {
        abort_unless($contact->user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'url' => ['required', 'string', 'max:500'],
        ]);

        $result = $inspector->inspect($validated['url']);

        return response()->json($result);
    }

    public function destroy(Request $request, Contact $contact, WebsiteAssessment $assessment): RedirectResponse
    {
        abort_unless($contact->user_id === $request->user()->id && $assessment->contact_id === $contact->id, 404);

        $assessment->delete();

        return back()->with('success', 'Assessment removed.');
    }
}

