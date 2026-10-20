<?php

namespace App\Http\Controllers;

use App\Models\ClientProject;
use App\Models\ClientProjectMilestone;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(ClientProject::STATUSES)],
            'currency' => ['nullable', Rule::in(ClientProject::CURRENCIES)],
        ]);

        $projects = $request->user()->clientProjects()
            ->with(['contact:id,name,email,phone', 'milestones'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', '%'.trim($search).'%')
                        ->orWhere('scope_summary', 'like', '%'.trim($search).'%')
                        ->orWhereHas('contact', fn ($q) => $q->where('name', 'like', '%'.trim($search).'%')->orWhere('email', 'like', '%'.trim($search).'%'));
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['currency'] ?? null, fn ($query, string $currency) => $query->where('currency', $currency))
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('client-projects/index', [
            'projects' => $projects,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'currency' => $filters['currency'] ?? '',
            ],
            'statuses' => ClientProject::STATUSES,
            'currencies' => ClientProject::CURRENCIES,
            'counts' => $request->user()->clientProjects()
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(ClientProject::STATUSES)],
            'currency' => ['required', Rule::in(ClientProject::CURRENCIES)],
            'budget_amount' => ['required', 'integer', 'min:0'],
            'scope_summary' => ['nullable', 'string', 'max:5000'],
            'agreed_deliverables' => ['nullable', 'array'],
            'agreed_deliverables.*' => ['string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'target_completion_date' => ['nullable', 'date'],
        ]);

        $contact = null;
        if (! empty($validated['contact_id'])) {
            $contact = $request->user()->contacts()->findOrFail($validated['contact_id']);
        }

        $project = $request->user()->clientProjects()->create($validated);

        if ($contact) {
            $contact->activities()->create([
                'type' => 'handoff_to_project',
                'description' => 'Converted won inquiry to client delivery project: '.$project->title,
                'metadata' => [
                    'project_id' => $project->id,
                    'budget' => $project->budget_amount,
                    'currency' => $project->currency,
                ],
                'created_at' => now(),
            ]);
        }

        return redirect()->route('client-projects.show', $project)->with('success', 'Client delivery project created.');
    }

    public function show(Request $request, ClientProject $project): Response
    {
        abort_unless($project->user_id === $request->user()->id, 404);

        $project->load(['contact', 'milestones']);

        return Inertia::render('client-projects/show', [
            'project' => $project,
            'statuses' => ClientProject::STATUSES,
            'currencies' => ClientProject::CURRENCIES,
            'milestoneStatuses' => ClientProjectMilestone::STATUSES,
        ]);
    }

    public function update(Request $request, ClientProject $project): RedirectResponse
    {
        abort_unless($project->user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(ClientProject::STATUSES)],
            'currency' => ['required', Rule::in(ClientProject::CURRENCIES)],
            'budget_amount' => ['required', 'integer', 'min:0'],
            'scope_summary' => ['nullable', 'string', 'max:5000'],
            'agreed_deliverables' => ['nullable', 'array'],
            'agreed_deliverables.*' => ['string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'target_completion_date' => ['nullable', 'date'],
        ]);

        if ($validated['status'] === 'completed' && $project->status !== 'completed') {
            $validated['completed_at'] = now();
        } elseif ($validated['status'] !== 'completed') {
            $validated['completed_at'] = null;
        }

        $project->update($validated);

        return back()->with('success', 'Project updated.');
    }

    public function storeMilestone(Request $request, ClientProject $project): RedirectResponse
    {
        abort_unless($project->user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(ClientProjectMilestone::STATUSES)],
        ]);

        if ($validated['status'] === 'completed') {
            $validated['completed_at'] = now();
        }

        $project->milestones()->create($validated);

        return back()->with('success', 'Milestone added.');
    }

    public function updateMilestone(Request $request, ClientProject $project, ClientProjectMilestone $milestone): RedirectResponse
    {
        abort_unless($project->user_id === $request->user()->id && $milestone->client_project_id === $project->id, 404);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(ClientProjectMilestone::STATUSES)],
        ]);

        if ($validated['status'] === 'completed' && $milestone->status !== 'completed') {
            $validated['completed_at'] = now();
        } elseif ($validated['status'] !== 'completed') {
            $validated['completed_at'] = null;
        }

        $milestone->update($validated);

        return back()->with('success', 'Milestone updated.');
    }

    public function destroyMilestone(Request $request, ClientProject $project, ClientProjectMilestone $milestone): RedirectResponse
    {
        abort_unless($project->user_id === $request->user()->id && $milestone->client_project_id === $project->id, 404);

        $milestone->delete();

        return back()->with('success', 'Milestone removed.');
    }
}

