import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

interface InvitationProps {
    token: string;
    workspace: string;
    role: string;
}

export default function AcceptWorkspaceInvitation({ token, workspace, role }: InvitationProps) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Workspaces', href: route('workspaces.index') }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accept workspace invitation" />
            <main className="mx-auto flex w-full max-w-xl flex-col gap-5 p-6">
                <h1 className="text-2xl font-bold text-foreground">Join {workspace}</h1>
                <p className="text-sm text-muted-foreground">
                    You were invited as a {role}. Accepting joins the workspace using your signed-in account.
                </p>
                <button
                    type="button"
                    onClick={() => router.post(route('workspaces.invitations.accept', { token }))}
                    className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                    Accept invitation
                </button>
            </main>
        </AppLayout>
    );
}
