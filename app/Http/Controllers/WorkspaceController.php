<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    private const ROLES = ['admin', 'editor', 'analyst', 'viewer'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $workspaces = Workspace::query()
            ->where('owner_id', $user->id)
            ->orWhereHas('members', fn ($query) => $query->whereKey($user->id))
            ->with(['members:id,name,email', 'invitations' => fn ($query) => $query
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now())
                ->select(['id', 'workspace_id', 'email', 'role', 'expires_at'])])
            ->orderBy('name')
            ->get()
            ->map(fn (Workspace $workspace): array => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'description' => $workspace->description,
                'type' => $workspace->type,
                'country' => $workspace->country,
                'language' => $workspace->language,
                'timezone' => $workspace->timezone,
                'market' => $workspace->market,
                'currency' => $workspace->currency,
                'role' => $workspace->roleFor($user),
                'members' => $workspace->members->map(fn (User $member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'role' => $member->pivot->role,
                ])->values(),
                'invitations' => $workspace->invitations->map(fn (WorkspaceInvitation $invitation) => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role,
                    'expires_at' => $invitation->expires_at->toISOString(),
                ])->values(),
            ]);

        $pendingInvitations = WorkspaceInvitation::query()
            ->with('workspace:id,name')
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->get()
            ->map(fn (WorkspaceInvitation $invitation) => [
                'id' => $invitation->id,
                'workspace' => $invitation->workspace->name,
                'role' => $invitation->role,
            ]);

        return Inertia::render('workspaces/index', [
            'workspaces' => $workspaces,
            'pendingInvitations' => $pendingInvitations,
            'inviteUrl' => session('workspace_invite_url'),
            'roles' => self::ROLES,
        ]);
    }

    public function edit(Request $request, Workspace $workspace): Response
    {
        $this->authorizeWorkspaceManagement($request, $workspace);

        return Inertia::render('workspaces/settings', [
            'workspace' => $workspace->only([
                'id',
                'name',
                'description',
                'type',
                'country',
                'language',
                'timezone',
                'market',
                'currency',
            ]),
        ]);
    }

    public function update(Request $request, Workspace $workspace): RedirectResponse
    {
        $this->authorizeWorkspaceManagement($request, $workspace);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', Rule::in(['agency', 'freelancer', 'creator', 'other'])],
            'country' => ['nullable', 'string', 'size:2', 'alpha'],
            'language' => ['required', Rule::in(['en', 'am'])],
            'timezone' => ['required', 'timezone'],
            'market' => ['required', Rule::in(['ethiopia', 'international'])],
            'currency' => ['required', Rule::in(['ETB', 'USD'])],
        ]);

        $workspace->update($validated);

        return to_route('workspaces.settings.edit', $workspace)->with('success', 'Workspace settings saved.');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate(['name' => ['required', 'string', 'max:150']]);
        $slug = Str::slug($validated['name']);
        $slug = $slug.'-'.Str::lower(Str::random(6));

        DB::transaction(function () use ($request, $validated, $slug): void {
            $workspace = Workspace::query()->create([
                'owner_id' => $request->user()->id,
                'name' => $validated['name'],
                'slug' => $slug,
            ]);
            $workspace->members()->attach($request->user()->id, ['role' => 'owner']);
        });

        return to_route('workspaces.index')->with('success', 'Workspace created.');
    }

    public function invite(Request $request, Workspace $workspace): RedirectResponse
    {
        abort_unless(in_array($workspace->roleFor($request->user()), ['owner', 'admin'], true), 403);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:254'],
            'role' => ['required', Rule::in(self::ROLES)],
        ]);
        if ($validated['role'] === 'admin') {
            abort_unless($workspace->roleFor($request->user()) === 'owner', 403);
        }
        abort_if(mb_strtolower($validated['email']) === mb_strtolower($request->user()->email), 422, 'You are already a workspace member.');

        $existingUser = User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($validated['email'])])->first();
        abort_if($existingUser && $workspace->members()->whereKey($existingUser->id)->exists(), 409, 'This user is already a workspace member.');

        $token = Str::random(64);
        WorkspaceInvitation::query()->updateOrCreate(
            [
                'workspace_id' => $workspace->id,
                'email' => mb_strtolower($validated['email']),
                'accepted_at' => null,
            ],
            [
                'invited_by' => $request->user()->id,
                'role' => $validated['role'],
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addDays(7),
            ],
        );

        return to_route('workspaces.index')->with([
            'success' => 'Invitation created. Share this private link with the invited person.',
            'workspace_invite_url' => route('workspaces.invitations.show', ['token' => $token]),
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invitation = WorkspaceInvitation::query()
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        abort_unless(mb_strtolower($invitation->email) === mb_strtolower($request->user()->email), 403);

        DB::transaction(function () use ($invitation, $request): void {
            $invitation->workspace->members()->syncWithoutDetaching([
                $request->user()->id => ['role' => $invitation->role],
            ]);
            $invitation->update(['accepted_at' => now()]);
        });

        return to_route('workspaces.index')->with('success', 'You joined the workspace.');
    }

    public function showInvitation(Request $request, string $token): Response
    {
        $invitation = WorkspaceInvitation::query()
            ->with('workspace:id,name')
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        abort_unless(mb_strtolower($invitation->email) === mb_strtolower($request->user()->email), 403);

        return Inertia::render('workspaces/accept', [
            'token' => $token,
            'workspace' => $invitation->workspace->name,
            'role' => $invitation->role,
        ]);
    }

    private function authorizeWorkspaceManagement(Request $request, Workspace $workspace): void
    {
        abort_unless(in_array($workspace->roleFor($request->user()), ['owner', 'admin'], true), 403);
    }
}
