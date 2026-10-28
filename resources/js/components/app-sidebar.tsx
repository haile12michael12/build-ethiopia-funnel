import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    BriefcaseBusiness,
    CalendarCheck2,
    CalendarClock,
    ClipboardCheck,
    FileText,
    FolderKanban,
    LayoutGrid,
    MessageSquareQuote,
    Plus,
    ShoppingBag,
    ShoppingCart,
    Users,
    UsersRound,
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
        title: 'Orders',
        href: '/manage/orders',
        icon: ShoppingCart,
    },
    {
        title: 'Developer analytics',
        href: '/developer-analytics',
        icon: BarChart3,
    },
    {
        title: 'Workspaces',
        href: '/workspaces',
        icon: UsersRound,
    },
    {
        title: 'Projects',
        href: '/projects',
        icon: FolderKanban,
    },
    {
        title: 'Client Delivery',
        href: '/client-projects',
        icon: BriefcaseBusiness,
    },
    {
        title: 'Content Studio',
        href: '/content-studio',
        icon: FileText,
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
        title: 'Follow-up tasks',
        href: '/follow-up-tasks',
        icon: CalendarClock,
    },
    {
        title: 'Appointments',
        href: '/appointments',
        icon: CalendarCheck2,
    },
    {
        title: 'Lead analytics',
        href: '/client-acquisition/analytics',
        icon: BarChart3,
    },
    {
        title: 'Demo appointments',
        href: '/appointments/manage',
        icon: CalendarClock,
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
