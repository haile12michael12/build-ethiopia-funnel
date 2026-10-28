import { EthioBizConcierge } from '@/components/concierge/EthioBizConcierge';
import { PublicFooter } from '@/components/navbar/public-footer';
import { PublicNavbar } from '@/components/navbar/public-navbar';
import { PublicTopbar } from '@/components/navbar/public-topbar';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ReactNode } from 'react';

interface PublicLayoutProps {
    children: ReactNode;
    className?: string;
}

export function PublicLayout({ children, className = '' }: PublicLayoutProps) {
    const { concierge } = usePage<SharedData>().props;

    return (
        <div className={`flex min-h-screen flex-col justify-between bg-background text-foreground ${className}`}>
            <PublicTopbar />
            <PublicNavbar />

            {/* Main Content */}
            <main className="flex-1">{children}</main>

            <PublicFooter />

            {concierge?.enabled ? <EthioBizConcierge /> : null}
        </div>
    );
}

export default PublicLayout;
