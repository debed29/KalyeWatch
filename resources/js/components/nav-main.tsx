
import { Link } from '@inertiajs/react';

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

// Define navigation properties and unread notification count.
type NavMainProps = {
    items: NavItem[];
    unreadCount?: number;
};

export function NavMain({
    items,
    unreadCount = 0,
}: NavMainProps) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>

            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <Link
                                href={item.href}
                                prefetch
                                className="flex w-full items-center"
                            >
                                {/* Display the navigation icon. */}
                                {item.icon && <item.icon />}

                                {/* Display the navigation label. */}
                                <span>{item.title}</span>

                                {/* Display exactly one unread badge. */}
                                {item.title === 'Notifications' &&
                                    unreadCount > 0 && (
                                        <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                                            {unreadCount > 99
                                                ? '99+'
                                                : unreadCount}
                                        </span>
                                    )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
