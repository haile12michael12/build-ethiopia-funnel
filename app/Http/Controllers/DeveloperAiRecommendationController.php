<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateDeveloperAiRecommendations;
use App\Models\Contact;
use App\Models\DeveloperAiRecommendation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeveloperAiRecommendationController extends Controller
{
    public function store(Request $request, Contact $contact): RedirectResponse
    {
        abort_unless($contact->user_id === $request->user()->id, 403);
        $contact->loadMissing(['developerProfile', 'funnel']);
        $isDeveloperLead = $contact->developerProfile
            || data_get($contact->metadata, 'developer_quiz_answers') !== null
            || in_array($contact->funnel?->slug, [
                'mern-saas-starter',
                'mern-starter-delivery',
                'developer-quiz',
                'mern-boilerplate',
                'mern-course',
                'code-review',
                'thank-you',
            ], true);
        abort_unless($isDeveloperLead, 422, 'AI developer recommendations are available only for developer-funnel leads.');

        $recent = $contact->developerAiRecommendations()
            ->where('created_at', '>=', now()->subMinutes(15))
            ->whereIn('status', ['queued', 'processing', 'pending_review'])
            ->exists();
        abort_if($recent, 429, 'A recent recommendation request is already queued or awaiting review.');

        $profile = $contact->developerProfile;
        $context = [
            'lead_score' => $contact->lead_score,
            'score_reasons' => collect($contact->lead_score_reasons ?? [])
                ->take(10)
                ->map(fn ($reason) => [
                    'reason' => mb_substr(strip_tags((string) data_get($reason, 'reason', '')), 0, 250),
                    'points' => (int) data_get($reason, 'points', 0),
                ])->values()->all(),
            'business_audit' => $this->safeScalarData($contact->business_audit ?? []),
            'quiz_answers' => $contact->submissions()
                ->latest()
                ->first()?->fields,
            'developer_profile' => $profile ? [
                'primary_language' => $profile->primary_language,
                'detected_stack' => array_slice($profile->detected_stack ?? [], 0, 12),
                'public_repo_count' => $profile->public_repo_count,
                'has_saas_repo' => $profile->has_saas_repo,
                'preferred_stack' => $profile->preferred_stack,
                'experience_level' => $profile->experience_level,
            ] : null,
        ];
        $context['quiz_answers'] = $this->safeScalarData(is_array($context['quiz_answers']) ? $context['quiz_answers'] : []);

        $recommendation = DB::transaction(function () use ($contact, $request, $context): DeveloperAiRecommendation {
            return $contact->developerAiRecommendations()->create([
                'user_id' => $request->user()->id,
                'status' => 'queued',
                'context_snapshot' => $context,
            ]);
        });
        GenerateDeveloperAiRecommendations::dispatch($recommendation->id)
            ->onQueue(config('automation.queue', 'default'));

        return back()->with('success', 'AI recommendations were queued for generation and will require your review.');
    }

    public function review(Request $request, Contact $contact, DeveloperAiRecommendation $recommendation): RedirectResponse
    {
        abort_unless($contact->user_id === $request->user()->id, 403);
        abort_unless($recommendation->contact_id === $contact->id && $recommendation->user_id === $request->user()->id, 404);

        $validated = $request->validate(['decision' => ['required', 'in:accepted,dismissed']]);
        abort_unless($recommendation->status === 'pending_review', 409);
        $recommendation->update([
            'status' => $validated['decision'],
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Recommendation review saved.');
    }

    private function safeScalarData(array $data, int $depth = 0): array
    {
        if ($depth > 2) {
            return [];
        }
        $safe = [];
        foreach (array_slice($data, 0, 30, true) as $key => $value) {
            if (preg_match('/email|phone|name|address|token|password/i', (string) $key)) {
                continue;
            }
            if (is_scalar($value) || $value === null) {
                $safe[mb_substr((string) $key, 0, 80)] = is_string($value) ? mb_substr(strip_tags($value), 0, 250) : $value;
            } elseif (is_array($value)) {
                $safe[mb_substr((string) $key, 0, 80)] = $this->safeScalarData($value, $depth + 1);
            }
        }

        return $safe;
    }
}
