<?php

namespace App\Http\Controllers;

use App\Jobs\CalculateLeadScore;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\LeadScoringRule;
use App\Services\DeveloperPersonalizationService;
use App\Services\GitHubProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GitHubProfileController extends Controller
{
    public function __invoke(
        Request $request,
        Funnel $funnel,
        GitHubProfileService $github,
        DeveloperPersonalizationService $personalization,
    ): JsonResponse {
        abort_unless($funnel->is_published && $funnel->slug === 'developer-quiz', 404);

        $validated = $request->validate([
            'username' => ['required', 'string', 'max:39', 'regex:/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/'],
            'session_id' => ['required', 'uuid'],
        ]);

        $sessionId = hash('sha256', $validated['session_id']);
        $contactId = FunnelEvent::query()
            ->where('session_id', $sessionId)
            ->whereNotNull('contact_id')
            ->whereHas('funnel', fn ($query) => $query->where('user_id', $funnel->user_id))
            ->value('contact_id');
        $contact = $contactId ? $funnel->user->contacts()->whereKey($contactId)->first() : null;
        abort_unless($contact, 422, 'Complete the email opt-in before connecting a GitHub profile.');

        $githubProfile = $github->lookup($validated['username']);
        $experience = data_get($contact->metadata, 'developer_quiz_answers.experience');

        $profile = DB::transaction(function () use ($contact, $githubProfile, $experience) {
            $profile = $contact->developerProfile()->updateOrCreate(
                ['contact_id' => $contact->id],
                [
                    'github_username' => $githubProfile['username'],
                    'github_profile_url' => $githubProfile['profile_url'],
                    'github_connected_at' => now(),
                    'primary_language' => $githubProfile['primary_language'],
                    'detected_stack' => $githubProfile['detected_stack'],
                    'public_repo_count' => $githubProfile['public_repo_count'],
                    'has_saas_repo' => $githubProfile['has_saas_repo'],
                    'preferred_stack' => $githubProfile['primary_language'],
                    'experience_level' => $experience,
                ],
            );

            LeadScoringRule::query()->firstOrCreate(
                [
                    'user_id' => $contact->user_id,
                    'event' => 'github_connected',
                    'field' => 'event',
                    'value' => 'github_connected',
                ],
                ['points' => 25, 'active' => true],
            );

            return $profile;
        });

        $eventId = $funnel->events()->create([
            'event_type' => 'github_connected',
            'contact_id' => $contact->id,
            'session_id' => $sessionId,
            'metadata' => ['signal' => 'github_profile_connected'],
            'occurred_at' => now(),
        ])->id;
        $scoring = CalculateLeadScore::dispatch($eventId)->onQueue(config('automation.queue', 'default'));
        if (config('queue.default') === 'sync') {
            $scoring->afterResponse();
        }

        $recommendation = $personalization->recommend($profile->loadMissing('contact'));
        $offer = $funnel->user->funnels()
            ->where('slug', $recommendation['offer_slug'])
            ->where('is_published', true)
            ->first();

        return response()->json([
            'profile' => [
                'username' => $profile->github_username,
                'profile_url' => $profile->github_profile_url,
                'primary_language' => $profile->primary_language,
                'detected_stack' => $profile->detected_stack ?? [],
                'public_repo_count' => $profile->public_repo_count,
            ],
            'recommendation' => [
                ...$recommendation,
                'offer_url' => $offer ? route('funnels.show', $offer->slug) : null,
            ],
        ]);
    }
}
