import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BookOpen,
    BriefcaseBusiness,
    ClipboardCheck,
    FileText,
    FolderKanban,
    LayoutGrid,
    ShoppingBag,
    MessageSquareQuote,
    Plus,
    Users,
    Workflow,
    Wrench,
    Zap,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Funnels',
        href: '/funnels',
        icon: Zap,
    },
    {
        title: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingBag,
    },
    {
        title: 'Projects',
        href: '/projects',
        icon: FolderKanban,
    },
    {
        title: 'Services',
        href: '/site-content/service',
        icon: Wrench,
    },
    {
        title: 'Blog Posts',
        href: '/site-content/blog',
        icon: BookOpen,
    },
    {
        title: 'Testimonials',
        href: '/site-content/testimonial',
        icon: MessageSquareQuote,
    },
    {
        title: 'Pages',
        href: '/site-content/page',
        icon: FileText,
    },
    {
        title: 'Contacts',
        href: '/contacts',
        icon: Users,
    },
    {
        title: 'Client Acquisition',
        href: '/settings/client-acquisition',
        icon: ClipboardCheck,
    },
    {
        title: 'Opportunities',
        href: '/opportunities',
        icon: BriefcaseBusiness,
    },
    {
        title: 'Automations',
        href: '/automations',
        icon: Workflow,
    },
    {
        title: 'Create Funnel',
        href: '/funnel-editor',
        icon: Plus,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {/* <NavFooter items={footerNavItems} className="mt-auto" /> */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
