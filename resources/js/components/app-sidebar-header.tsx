
import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

// Define the structure of a database notification.
type NotificationItem = {
    id: string;
    read_at: string | null;
    data: {
        incident_id: number;
        category: string;
        status: string;
        reason?: string | null;
        message?: string;
    };
    created_at: string;
};

// Define the shared Inertia properties used by this header.
type SharedProps = {
    unreadNotificationsCount?: number;
    recentNotifications?: NotificationItem[];
};

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    // Get shared notification information from Laravel.
    const page = usePage<SharedProps>();

    // Read the unread count and recent notifications.
    const unreadCount = page.props.unreadNotificationsCount ?? 0;
    const notifications = page.props.recentNotifications ?? [];

    // Track the notification dropdown's open state.
    const [open, setOpen] = useState(false);

    // Mark a notification as read when selected.
    const markAsRead = (id: string) => {
        router.patch(
            `/notifications/${id}/read`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            },
        );
    };

    // Mark all notifications as read.
    const markAllAsRead = () => {
        router.patch(
            '/notifications/read-all',
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">

            {/* Sidebar toggle and current page breadcrumbs. */}
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1" />

                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {/* Notification bell and dropdown. */}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Open notifications"
                        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {/* Notification bell icon. */}
                        <Bell className="size-5" />

                        {/* Display one unread notification badge. */}
                        {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    className="w-80 max-w-[calc(100vw-2rem)]"
                >
                    {/* Dropdown heading and mark-all action. */}
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Notifications</span>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground"
                            >
                                <CheckCheck className="size-3.5" />
                                Mark all as read
                            </button>
                        )}
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {/* Display recent notifications. */}
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                onSelect={() => {
                                    if (!notification.read_at) {
                                        markAsRead(notification.id);
                                    } else {
                                        setOpen(false);
                                    }
                                }}
                                className="flex cursor-pointer flex-col items-start gap-1 whitespace-normal py-3"
                            >
                                <div className="flex w-full items-center justify-between gap-2">
                                    <span className="font-medium">
                                        {notification.data.category}
                                    </span>

                                    {/* Highlight unread notifications. */}
                                    {!notification.read_at && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                            New
                                        </span>
                                    )}
                                </div>

                                <span className="text-xs text-muted-foreground">
                                    {notification.data.message ??
                                        `Your ${notification.data.category} report has been updated.`}
                                </span>

                                <span className="text-xs text-muted-foreground">
                                    Status: {notification.data.status}
                                </span>
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No notifications yet.
                        </div>
                    )}

                    <DropdownMenuSeparator />

                    {/* Link to the complete notifications page. */}
                    <DropdownMenuItem asChild>
                        <Link
                            href="/notifications"
                            className="justify-center text-sm font-medium"
                            onClick={() => setOpen(false)}
                        >
                            View All Notifications
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
