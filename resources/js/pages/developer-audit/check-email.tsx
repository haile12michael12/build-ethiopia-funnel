import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';

export default function DeveloperAuditCheckEmail() {
    return (
        <PublicLayout>
            <Head title="Check your email" />
            <main className="px-4 py-16 sm:px-6">
                <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                    <MailCheck className="mx-auto size-10 text-primary" />
                    <h1 className="mt-4 text-2xl font-bold">Check your inbox</h1>
                    <p className="mt-3 text-muted-foreground">
                        If the ZIP passed validation, a time-limited private link will arrive at the email address you provided. The report link expires
                        after seven days.
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Email delivery depends on the application’s mail and queue configuration. Check your spam folder if it does not arrive.
                    </p>
                    <Link href={route('developer-audit.index')} className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
                        Submit another ZIP
                    </Link>
                </section>
            </main>
        </PublicLayout>
    );
}
