
import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    LayoutGrid,
    ClipboardList,
    FilePlus2,
    Bell,
} from 'lucide-react';

import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    // Get the current authenticated user and page information.
    const page = usePage();

    // Redirect authenticated users to their dashboard.
    const dashboardUrl = page.props.auth.user ? dashboard() : '/';

    // Main navigation links for KalyeWatch.
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: LayoutGrid,
        },
        {
            title: 'Submit Incident',
            href: '/incidents/create',
            icon: FilePlus2,
        },
        {
            title: 'My Reports',
            href: '/incidents',
            icon: ClipboardList,
        },
        {
            // Opens the user's incident notifications.
            title: 'Notifications',
            href: '/notifications',
            icon: Bell,
        },
    ];

    // Footer navigation links.
    const footerNavItems: NavItem[] = [
        {
            title: 'Repository',
            href: 'https://github.com/laravel/react-starter-kit',
            icon: FolderGit2,
        },
        {
            title: 'Documentation',
            href: 'https://laravel.com/docs/starter-kits#react',
            icon: BookOpen,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">

            {/* Application logo and team switcher. */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <SidebarMenu>
                    <SidebarMenuItem>
                        <TeamSwitcher />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Main application navigation. */}
            <SidebarContent>
                {/* Display navigation items and the unread notification counter. */}
                <NavMain
                items={mainNavItems}
                unreadCount={page.props.unreadNotificationsCount ?? 0}
        />
            </SidebarContent>

            {/* Footer links and authenticated user menu. */}
            <SidebarFooter>
                <NavFooter
                    items={footerNavItems}
                    className="mt-auto"
                />
                <NavUser />
            </SidebarFooter>

        </Sidebar>
    );
}
