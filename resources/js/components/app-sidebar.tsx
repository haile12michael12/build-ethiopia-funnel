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
        href: '/admin',
        icon: LayoutGrid,
    },
    {
        title: 'Funnels',
        href: '/admin/funnels',
        icon: Zap,
    },
    {
        title: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingBag,
    },
    {
        title: 'Orders',
        href: '/admin/manage/orders',
        icon: ShoppingCart,
    },
    {
        title: 'Developer analytics',
        href: '/admin/developer-analytics',
        icon: BarChart3,
    },
    {
        title: 'Workspaces',
        href: '/admin/workspaces',
        icon: UsersRound,
    },
    {
        title: 'Projects',
        href: '/admin/projects',
        icon: FolderKanban,
    },
    {
        title: 'Client Delivery',
        href: '/admin/client-projects',
        icon: BriefcaseBusiness,
    },
    {
        title: 'Content Studio',
        href: '/admin/content-studio',
        icon: FileText,
    },
    {
        title: 'Services',
        href: '/admin/site-content/service',
        icon: Wrench,
    },
    {
        title: 'Blog Posts',
        href: '/admin/site-content/blog',
        icon: BookOpen,
    },
    {
        title: 'Testimonials',
        href: '/admin/site-content/testimonial',
        icon: MessageSquareQuote,
    },
    {
        title: 'Pages',
        href: '/admin/site-content/page',
        icon: FileText,
    },
    {
        title: 'Contacts',
        href: '/admin/contacts',
        icon: Users,
    },
    {
        title: 'Follow-up tasks',
        href: '/admin/follow-up-tasks',
        icon: CalendarClock,
    },
    {
        title: 'Appointments',
        href: '/admin/appointments',
        icon: CalendarCheck2,
    },
    {
        title: 'Lead analytics',
        href: '/admin/client-acquisition/analytics',
        icon: BarChart3,
    },
    {
        title: 'Demo appointments',
        href: '/admin/appointments/manage',
        icon: CalendarClock,
    },
    {
        title: 'Client Acquisition',
        href: '/admin/settings/client-acquisition',
        icon: ClipboardCheck,
    },
    {
        title: 'Opportunities',
        href: '/admin/opportunities',
        icon: BriefcaseBusiness,
    },
    {
        title: 'Automations',
        href: '/admin/automations',
        icon: Workflow,
    },
    {
        title: 'Create Funnel',
        href: '/admin/funnel-editor',
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
                            <Link href="/admin" prefetch>
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
