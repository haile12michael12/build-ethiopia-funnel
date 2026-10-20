<?php

namespace App\Http\Controllers;

use App\Models\Funnel;
use App\Models\FunnelExperiment;
use App\Services\FunnelExperimentEvaluator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FunnelExperimentController extends Controller
{
    use AuthorizesRequests;

    public function index(Funnel $funnel, FunnelExperimentEvaluator $evaluator): Response
    {
        $this->authorize('view', $funnel);
        $experiments = $funnel->experiments()->latest()->get();
        $variants = $funnel->variants()->orderBy('id')->get(['id', 'name', 'weight', 'is_active']);

        return Inertia::render('funnel-experiments', [
            'funnel' => ['id' => $funnel->id, 'name' => $funnel->name, 'is_published' => $funnel->is_published],
            'variants' => $variants,
            'experiments' => $experiments->map(fn (FunnelExperiment $experiment) => [
                'id' => $experiment->id,
                'name' => $experiment->name,
                'hypothesis' => $experiment->hypothesis,
                'target_step' => $experiment->target_step,
                'primary_metric' => $experiment->primary_metric,
                'guardrail_metrics' => $experiment->guardrail_metrics ?? [],
                'allocations' => $experiment->allocations ?? [],
                'status' => $experiment->status,
                'starts_at' => $experiment->starts_at?->toISOString(),
                'ends_at' => $experiment->ends_at?->toISOString(),
                'ended_at' => $experiment->ended_at?->toISOString(),
                'activity_history' => $experiment->activity_history ?? [],
                'evaluation' => $evaluator->evaluate($experiment),
            ]),
        ]);
    }

    public function store(Request $request, Funnel $funnel): RedirectResponse|JsonResponse
    {
        $this->authorize('update', $funnel);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'hypothesis' => ['required', 'string', 'max:2000'],
            'target_step' => ['nullable', 'string', 'max:80'],
            'primary_metric' => ['required', 'in:conversion_rate,form_completion_rate,cta_click_rate'],
            'guardrail_metrics' => ['nullable', 'array', 'max:5'],
            'guardrail_metrics.*' => ['required', 'distinct', 'in:conversion_rate,form_completion_rate,cta_click_rate,form_validation_errors'],
            'allocations' => ['required', 'array', 'min:1', 'max:5'],
            'allocations.*.variant_id' => ['required', 'integer', 'distinct'],
            'allocations.*.weight' => ['required', 'integer', 'min:1', 'max:99'],
            'starts_at' => ['nullable', 'date', 'after_or_equal:now'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ]);

        $allocationTotal = collect($validated['allocations'])->sum('weight');
        if ($allocationTotal >= 100) {
            throw ValidationException::withMessages([
                'allocations' => 'Variant allocations must total less than 100% so the control always receives traffic.',
            ]);
        }
        $variantIds = collect($validated['allocations'])->pluck('variant_id')->map(fn ($id) => (int) $id);
        if ($funnel->variants()->whereIn('id', $variantIds)->count() !== $variantIds->count()) {
            throw ValidationException::withMessages(['allocations' => 'Choose variants that belong to this funnel.']);
        }

        $experiment = $funnel->experiments()->create([
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'hypothesis' => $validated['hypothesis'],
            'target_step' => $validated['target_step'] ?? null,
            'primary_metric' => $validated['primary_metric'],
            'guardrail_metrics' => $validated['guardrail_metrics'] ?? [],
            'allocations' => collect($validated['allocations'])
                ->map(fn (array $allocation) => ['variant_id' => (int) $allocation['variant_id'], 'weight' => (int) $allocation['weight']])
                ->values()
                ->all(),
            'status' => 'draft',
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'activity_history' => [[
                'status' => 'draft',
                'actor_user_id' => auth()->id(),
                'at' => now()->toISOString(),
            ]],
        ]);

        if ($request->expectsJson()) {
            return response()->json(['id' => $experiment->id, 'created' => true], 201);
        }

        return back()->with('success', 'Experiment draft created. Review its allocation and start it when ready.');
    }

    public function updateStatus(Request $request, Funnel $funnel, FunnelExperiment $experiment): RedirectResponse
    {
        $this->authorize('update', $funnel);
        abort_unless($experiment->funnel_id === $funnel->id && $experiment->user_id === auth()->id(), 404);
        $validated = $request->validate(['status' => ['required', 'in:running,paused,completed,cancelled']]);

        DB::transaction(function () use ($funnel, $experiment, $validated): void {
            $funnel->newQuery()->whereKey($funnel->id)->lockForUpdate()->firstOrFail();
            $experiment->refresh();
            $status = $validated['status'];

            $allowed = match ($experiment->status) {
                'draft' => ['running', 'cancelled'],
                'running' => ['paused', 'completed', 'cancelled'],
                'paused' => ['running', 'completed', 'cancelled'],
                default => [],
            };
            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages(['status' => 'This experiment cannot transition to the requested status.']);
            }

            if ($status === 'running') {
                if (! $funnel->is_published) {
                    throw ValidationException::withMessages(['status' => 'Publish the funnel before starting an experiment.']);
                }
                $otherRunning = $funnel->experiments()
                    ->whereKeyNot($experiment->id)
                    ->where('status', 'running')
                    ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))
                    ->exists();
                if ($otherRunning) {
                    throw ValidationException::withMessages(['status' => 'Only one experiment can run on a funnel at a time.']);
                }
                if ($experiment->ends_at && $experiment->ends_at->isPast()) {
                    throw ValidationException::withMessages(['status' => 'The scheduled end date has passed. Edit the experiment dates before resuming.']);
                }
            }

            $experiment->recordStatus($status, (int) auth()->id());
        });

        return back()->with('success', 'Experiment status updated.');
    }
}
