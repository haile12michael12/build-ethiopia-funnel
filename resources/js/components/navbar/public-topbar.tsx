import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';

const socialLinks = [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
    { label: 'Telegram', href: 'https://telegram.org/' },
    { label: 'Instagram', href: 'https://www.instagram.com/' },
    { label: 'Facebook', href: 'https://www.facebook.com/' },
];

export function PublicTopbar() {
    const { auth, locale: serverLocale, translations } = usePage<SharedData>().props;
    const currentLocale = serverLocale === 'am' ? 'am' : 'en';
    const navigationTranslations = translations?.navigation;
    const signInLabel = typeof navigationTranslations?.sign_in === 'string' ? navigationTranslations.sign_in : 'Sign In';
    const registerLabel = typeof navigationTranslations?.register === 'string' ? navigationTranslations.register : 'Register';
    const accountLabel = typeof navigationTranslations?.account === 'string' ? navigationTranslations.account : 'My Account';
    const dashboardLabel = typeof navigationTranslations?.dashboard === 'string' ? navigationTranslations.dashboard : 'Dashboard';

    const handleLocaleSwitch = (newLocale: 'en' | 'am') => {
        if (newLocale === currentLocale) return;
        router.post(route('locale.update', { locale: newLocale }), {}, { preserveScroll: true });
    };

    return (
        <div className="border-b border-border/60 bg-card/60 text-xs">
            <div className="mx-auto flex min-h-10 max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
                <nav aria-label="Social media" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    {socialLinks.map(({ label, href }) => (
                        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                            {label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-border bg-background p-0.5" role="group" aria-label="Language selector">
                        <button
                            type="button"
                            onClick={() => handleLocaleSwitch('en')}
                            className={`rounded px-2 py-1 font-semibold transition-colors ${
                                currentLocale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-pressed={currentLocale === 'en'}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => handleLocaleSwitch('am')}
                            className={`font-amharic rounded px-2 py-1 font-semibold transition-colors ${
                                currentLocale === 'am' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-pressed={currentLocale === 'am'}
                        >
                            አማርኛ
                        </button>
                    </div>

                    <div className="flex items-center gap-3 border-l border-border pl-3 font-medium">
                        {auth.user ? (
                            <Link
                                href={auth.is_business_owner ? route('dashboard') : route('customer.dashboard')}
                                className="text-primary transition-colors hover:text-primary/80"
                            >
                                {auth.is_business_owner ? dashboardLabel : accountLabel}
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="text-muted-foreground transition-colors hover:text-foreground">
                                    {signInLabel}
                                </Link>
                                <Link href={route('register')} className="text-primary transition-colors hover:text-primary/80">
                                    {registerLabel}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}