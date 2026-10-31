<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function customerIndex(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && ! $user->isBusinessOwner(), 403);

        $activities = Activity::query()
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('account/activity', [
            'activities' => $activities->through(fn (Activity $activity): array => $this->present($activity)),
        ]);
    }

    public function ownerIndex(Request $request): Response
    {
        abort_unless($request->user()?->isBusinessOwner(), 403);

        $filters = array_merge([
            'action' => '',
            'user_id' => '',
            'date_from' => '',
            'date_to' => '',
        ], $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ]));

        $activities = Activity::query()
            ->with('user:id,name,email')
            ->when($filters['action'] !== '', fn ($query) => $query->where('action', $filters['action']))
            ->when($filters['user_id'] !== '', fn ($query) => $query->where('user_id', $filters['user_id']))
            ->when($filters['date_from'] !== '', fn ($query) => $query->whereDate('created_at', '>=', $filters['date_from']))
            ->when($filters['date_to'] !== '', fn ($query) => $query->whereDate('created_at', '<=', $filters['date_to']))
            ->latest()
            ->paginate(50)
            ->withQueryString()
            ->through(fn (Activity $activity): array => $this->present($activity, includeUser: true));

        return Inertia::render('admin/activity', [
            'activities' => $activities,
            'filters' => $filters,
            'actions' => Activity::query()->distinct()->orderBy('action')->pluck('action'),
            'users' => User::query()->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Activity $activity, bool $includeUser = false): array
    {
        return [
            'id' => $activity->id,
            'action' => $activity->action,
            'meta' => $activity->meta ?? [],
            'created_at' => $activity->created_at?->toIso8601String(),
            'user' => $includeUser ? $activity->user?->only(['id', 'name', 'email']) : null,
        ];
    }
}