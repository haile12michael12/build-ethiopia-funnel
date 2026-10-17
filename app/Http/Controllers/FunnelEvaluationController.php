<?php

namespace App\Http\Controllers;

use App\Jobs\CalculateLeadScore;
use App\Models\Contact;
use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Services\FunnelBranchResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FunnelEvaluationController extends Controller
{
    public function __invoke(Request $request, Funnel $funnel, FunnelBranchResolver $branches): JsonResponse
    {
        abort_unless($funnel->is_published, 404);

        $validated = $request->validate([
            'step_slug' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'answers' => ['required', 'array', 'max:50'],
            'answers.*' => ['nullable', 'string', 'max:500'],
            'session_id' => ['required_if:step_slug,developer-quiz', 'nullable', 'uuid'],
            'variant_id' => ['nullable', 'integer'],
            'attribution' => ['nullable', 'array'],
            'attribution.utm_source' => ['nullable', 'string', 'max:255'],
            'attribution.utm_medium' => ['nullable', 'string', 'max:255'],
            'attribution.utm_campaign' => ['nullable', 'string', 'max:255'],
            'attribution.referrer' => ['nullable', 'url', 'max:2000'],
            'attribution.device' => ['nullable', 'in:mobile,tablet,desktop'],
        ]);

        if ($validated['step_slug'] === 'developer-quiz') {
            $validated['answers'] = $request->validate([
                'answers.experience' => ['required', Rule::in(['beginner', 'intermediate', 'advanced'])],
                'answers.goal' => ['required', Rule::in(['launch-saas', 'client-projects', 'get-developer-job', 'learn-full-stack'])],
                'answers.timeline' => ['required', Rule::in(['immediately', 'soon', 'exploring'])],
            ])['answers'];
        }

        if (isset($validated['variant_id']) && ! $funnel->variants()->whereKey($validated['variant_id'])->exists()) {
            abort(422, 'Invalid experiment variant.');
        }

        $configuration = $funnel->step_branches[$validated['step_slug']] ?? null;
        abort_unless(is_array($configuration), 404);

        $result = $branches->resolve($configuration, ['answers' => $validated['answers']]);
        $destination = Funnel::query()
            ->where('user_id', $funnel->user_id)
            ->where('slug', $result['next_step_slug'])
            ->where('is_published', true)
            ->first();

        abort_unless($destination, 422, 'The configured next step is not available.');

        $sessionId = isset($validated['session_id']) ? hash('sha256', $validated['session_id']) : null;
        $attribution = $validated['attribution'] ?? [];
        $variantId = $validated['variant_id'] ?? null;
        $matchedBranch = $result['matched_branch'];

        $contactId = $sessionId
            ? FunnelEvent::query()
                ->where('session_id', $sessionId)
                ->whereNotNull('contact_id')
                ->whereHas('funnel', fn ($query) => $query->where('user_id', $funnel->user_id))
                ->value('contact_id')
            : null;
        $contact = $contactId
            ? $funnel->user->contacts()->whereKey($contactId)->first()
            : null;
        if ($validated['step_slug'] === 'developer-quiz') {
            abort_unless($contact, 422, 'Complete the email opt-in before taking the developer quiz.');
        }

        $scoreEventId = DB::transaction(function () use (
            $funnel,
            $validated,
            $variantId,
            $sessionId,
            $attribution,
            $matchedBranch,
            $result,
            $contact,
        ): ?int {
            $metadata = [
                'step_slug' => $validated['step_slug'],
                'matched_branch' => $matchedBranch ?? '',
                'next_step_slug' => $result['next_step_slug'],
            ];
            $funnel->events()->create([
                'event_type' => 'branch_evaluated',
                'contact_id' => $contact?->id,
                'variant_id' => $variantId,
                'session_id' => $sessionId,
                'attribution' => $attribution,
                'metadata' => $metadata,
                'occurred_at' => now(),
            ]);

            if ($validated['step_slug'] !== 'developer-quiz') {
                return null;
            }

            if ($contact) {
                $contact->forceFill([
                    'metadata' => [
                        ...($contact->metadata ?? []),
                        'developer_quiz_answers' => $validated['answers'],
                    ],
                ])->save();
            }

            return $funnel->events()->create([
                'event_type' => 'quiz_completed',
                'contact_id' => $contact?->id,
                'variant_id' => $variantId,
                'session_id' => $sessionId,
                'attribution' => $attribution,
                'metadata' => ['step_slug' => $validated['step_slug']],
                'occurred_at' => now(),
            ])->id;
        });

        if ($scoreEventId) {
            $scoring = CalculateLeadScore::dispatch($scoreEventId)
                ->onQueue(config('automation.queue', 'default'));
            if (config('queue.default') === 'sync') {
                $scoring->afterResponse();
            }
        }

        return response()->json([
            'matched_branch' => $matchedBranch,
            'next_step_slug' => $result['next_step_slug'],
            'next_step_url' => route('funnels.show', $destination->slug),
        ]);
    }
}
