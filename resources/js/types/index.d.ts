import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
    is_business_owner: boolean;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface TranslationDictionary {
    [key: string]: string | TranslationDictionary;
}

export interface ConciergeQuickTopic {
    label: string;
    question: string;
}

export interface ConciergeTranslations {
    title: string;
    subtitle: string;
    open: string;
    close: string;
    placeholder: string;
    send: string;
    sending: string;
    greeting: string;
    ai_source: string;
    knowledge_source: string;
    disclaimer: string;
    error: string;
    unsupported: string;
    quick_topics: ConciergeQuickTopic[];
    language: { en: string; am: string };
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    locale: string;
    /** Public "Book a Call" destination, present when an active booking page exists. */
    bookingCtaUrl?: string | null;
    translations?: {
        navigation?: TranslationDictionary;
        copilot?: Record<string, string>;
        client_acquisition?: Record<string, string>;
        concierge?: ConciergeTranslations;
        [key: string]: unknown;
    };
    concierge?: { enabled: boolean };
    appointments?: { booking_enabled: boolean };
    demo: { enabled: boolean; active: boolean; expires_at: string | null };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    is_demo: boolean;
    [key: string]: unknown; // This allows for additional properties...
}
