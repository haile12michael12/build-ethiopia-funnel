<?php

namespace App\Http\Controllers;

use App\Models\FollowUpTask;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class FollowUpTaskController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'view' => ['nullable', Rule::in(['overdue', 'today', 'upcoming', 'all'])],
        ]);
        $view = $validated['view'] ?? 'today';
        $tasks = $request->user()->followUpTasks()
            ->with('contact:id,name,email,status')
            ->when($view !== 'all', function (Builder $query) use ($view): void {
                $query->where('status', 'pending')
                    ->when($view === 'overdue', fn (Builder $builder) => $builder->where('due_at', '<', now()))
                    ->when($view === 'today', fn (Builder $builder) => $builder->whereDate('due_at', today()))
                    ->when($view === 'upcoming', fn (Builder $builder) => $builder->where('due_at', '>', now()->endOfDay()));
            })
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderBy('due_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (FollowUpTask $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'due_at' => $task->due_at->format('M j, Y g:i A'),
                'status' => $task->status,
                'completed_at' => $task->completed_at?->format('M j, Y g:i A'),
                'contact' => [
                    'id' => $task->contact->id,
                    'name' => $task->contact->name,
                    'email' => $task->contact->email,
                    'status' => $task->contact->status,
                ],
            ]);

        return Inertia::render('follow-up-tasks/index', [
            'tasks' => $tasks,
            'view' => $view,
            'counts' => [
                'overdue' => $request->user()->followUpTasks()->where('status', 'pending')->where('due_at', '<', now())->count(),
                'today' => $request->user()->followUpTasks()->where('status', 'pending')->whereDate('due_at', today())->count(),
                'upcoming' => $request->user()->followUpTasks()->where('status', 'pending')->where('due_at', '>', now()->endOfDay())->count(),
            ],
        ]);
    }

    public function store(Request $request, int $contactId): RedirectResponse
    {
        $contact = $request->user()->contacts()->findOrFail($contactId);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'due_at' => ['required', 'date'],
        ]);

        DB::transaction(function () use ($request, $contact, $validated): void {
            $task = $request->user()->followUpTasks()->create([
                ...$validated,
                'contact_id' => $contact->id,
            ]);
            $contact->activities()->create([
                'actor_user_id' => $request->user()->id,
                'type' => 'task_created',
                'payload' => ['task_id' => $task->id, 'title' => $task->title, 'due_at' => $task->due_at->toISOString()],
            ]);
        });

        return back()->with('success', 'Follow-up task created. No reminder notification was sent.');
    }

    public function update(Request $request, FollowUpTask $task): RedirectResponse
    {
        abort_unless($task->user_id === $request->user()->id, 403);
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'due_at' => ['sometimes', 'required', 'date'],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'completed', 'cancelled'])],
        ]);

        DB::transaction(function () use ($request, $task, $validated): void {
            $previousDueAt = $task->due_at;
            $previousStatus = $task->status;
            $status = $validated['status'] ?? $previousStatus;
            $task->update([
                ...$validated,
                'completed_at' => $status === 'completed'
                    ? ($previousStatus === 'completed' ? $task->completed_at : now())
                    : null,
            ]);

            $type = $task->status !== $previousStatus
                ? ($task->status === 'completed' ? 'task_completed' : ($task->status === 'cancelled' ? 'task_cancelled' : 'task_reopened'))
                : ($task->due_at->ne($previousDueAt) ? 'task_rescheduled' : 'task_updated');
            $task->contact->activities()->create([
                'actor_user_id' => $request->user()->id,
                'type' => $type,
                'payload' => ['task_id' => $task->id, 'title' => $task->title, 'due_at' => $task->due_at->toISOString()],
            ]);
        });

        return back()->with('success', 'Follow-up task updated.');
    }
}
