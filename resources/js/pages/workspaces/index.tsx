import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface Workspace {
    id: number;
    name: string;
    slug: string;
    role: string;
    members: Array<{ id: number; name: string; email: string; role: string }>;
    invitations: Array<{ id: number; email: string; role: string; expires_at: string }>;
}

interface WorkspacePageProps {
    workspaces: Workspace[];
    pendingInvitations: Array<{ id: number; workspace: string; role: string }>;
    inviteUrl: string | null;
    roles: string[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Workspaces', href: route('workspaces.index') }];

export default function WorkspacesIndex({ workspaces, pendingInvitations, inviteUrl, roles }: WorkspacePageProps) {
    const [name, setName] = useState('');
    const createWorkspace = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(route('workspaces.store'), { name }, { onSuccess: () => setName('') });
    };

    const inviteMember = (event: FormEvent<HTMLFormElement>, workspaceId: number) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        router.post(route('workspaces.invitations.store', workspaceId), {
            email: values.get('email'),
            role: values.get('role'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Workspaces" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
                <header>
                    <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Invite collaborators with scoped roles. Owners and admins can invite members; only owners can grant admin access.
                    </p>
                </header>
                {inviteUrl && (
                    <div className="rounded-lg border border-primary/30 bg-card p-4">
                        <p className="text-sm font-medium text-foreground">
                            Share this invitation link. It expires in seven days and only works for the invited email address.
                        </p>
                        <div className="mt-2 flex gap-2">
                            <input
                                readOnly
                                value={inviteUrl}
                                className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => void navigator.clipboard.writeText(inviteUrl)}
                                className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                            >
                                Copy link
                            </button>
                        </div>
                    </div>
                )}
                {pendingInvitations.length > 0 && (
                    <section className="rounded-xl border border-border bg-card p-5">
                        <h2 className="font-semibold text-foreground">Invitations for you</h2>
                        <ul className="mt-3 space-y-3">
                            {pendingInvitations.map((invitation) => (
                                <li key={invitation.id} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-muted-foreground">
                                        {invitation.workspace} · {invitation.role}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Open the invitation link sent by the workspace owner.</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                <form onSubmit={createWorkspace} className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-5">
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        maxLength={150}
                        placeholder="Workspace name"
                        className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                        Create workspace
                    </button>
                </form>
                <section className="space-y-4">
                    {workspaces.map((workspace) => (
                        <article key={workspace.id} className="rounded-xl border border-border bg-card p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">{workspace.name}</h2>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        {workspace.role} · {workspace.members.length} members
                                    </p>
                                </div>
                                {['owner', 'admin'].includes(workspace.role) && (
                                    <form onSubmit={(event) => inviteMember(event, workspace.id)} className="flex flex-wrap gap-2">
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            maxLength={254}
                                            placeholder="member@example.com"
                                            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                                        />
                                        <select name="role" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                                            {roles
                                                .filter((role) => role !== 'admin' || workspace.role === 'owner')
                                                .map((role) => (
                                                    <option key={role} value={role}>
                                                        {role}
                                                    </option>
                                                ))}
                                        </select>
                                        <button
                                            type="submit"
                                            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                                        >
                                            Invite
                                        </button>
                                    </form>
                                )}
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {workspace.members.map((member) => (
                                    <div key={member.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                                        <span className="font-medium text-foreground">{member.name}</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {member.email} · {member.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {workspace.invitations.length > 0 && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Pending: {workspace.invitations.map((invite) => `${invite.email} (${invite.role})`).join(', ')}
                                </p>
                            )}
                        </article>
                    ))}
                    {workspaces.length === 0 && (
                        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                            Create a workspace to invite your collaborators.
                        </p>
                    )}
                </section>
            </main>
        </AppLayout>
    );
}
