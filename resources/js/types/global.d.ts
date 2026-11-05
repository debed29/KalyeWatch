import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;

            // Number of unread notifications displayed in the sidebar.
            unreadNotificationsCount: number;

            // Recent notifications shared with the notification dropdown.
            recentNotifications: Array<{
                id: string;
                type: string;
                data: Record<string, unknown>;
                read_at: string | null;
                created_at: string;
            }>;

            // Other shared application properties are defined by Laravel.
            [key: string]: unknown;
        };
    }
}
