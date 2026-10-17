import PublicLayout from '@/layouts/public-layout';
import { Head } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';

export default function DeveloperAuditConfirmUnlock({ confirmationUrl }: { confirmationUrl: string }) {
    const csrfToken = typeof document === 'undefined' ? null : (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null);

    return (
        <PublicLayout>
            <Head title="Unlock your code audit report" />
            <main className="px-4 py-16 sm:px-6">
                <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                    <LockKeyhole className="mx-auto size-10 text-primary" />
                    <h1 className="mt-4 text-2xl font-bold">Unlock your report</h1>
                    <p className="mt-3 text-muted-foreground">
                        Confirm to open the private report in this browser. The report link expires after seven days.
                    </p>
                    <form action={confirmationUrl} method="post" className="mt-6">
                        <input type="hidden" name="_token" value={csrfToken ?? ''} />
                        <button
                            type="submit"
                            disabled={!csrfToken}
                            className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                            View audit report
                        </button>
                    </form>
                </section>
            </main>
        </PublicLayout>
    );
}
