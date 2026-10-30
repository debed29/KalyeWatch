
import { Head, Link, router } from '@inertiajs/react';

// Both notification types use Laravel's existing database notifications.
type NotificationData = {
    alert_type?: string;
    incident_id?: number;
    category?: string;
    status?: string;
    severity?: string;
    priority?: string;
    incident_date?: string;
    approximate_area?: string;
    message: string;
    reason?: string | null;
    link?: string;
};

type Notification = {
    id: string;
    data: NotificationData;
    read_at: string | null;
    created_at: string;
};

type Props = {
    notifications: {
        data: Notification[];
        total: number;
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
    };
    unreadCount: number;
};

export default function Notifications({
    notifications,
    unreadCount,
}: Props) {
    return (
        <>
            <Head title="Notifications | KalyeWatch" />

            <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">

                {/* Page heading and unread notification count */}
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Notifications
                        </h1>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Report updates and community safety alerts.
                        </p>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {unreadCount} unread notification(s)
                        </p>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={() =>
                                router.patch('/notifications/read-all')
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            Mark all as read
                        </button>
                    )}
                </header>

                {/* Notification list */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">

                    {notifications.data.length === 0 ? (
                        <div className="p-12 text-center">
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                No notifications yet
                            </h2>

                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Your report updates and safety alerts will appear here.
                            </p>
                        </div>
                    ) : (
                        notifications.data.map((notification) => {
                            // Identify whether this is a community safety alert.
                            const isSafetyAlert =
                                notification.data.alert_type ===
                                'community_safety_alert';

                            const severity =
                                notification.data.severity;

                            const isHighPriority =
                                notification.data.priority === 'high';

                            return (
                                <article
                                    key={notification.id}
                                    className={`border-b border-gray-200 p-5 last:border-0 dark:border-gray-800 ${
                                        notification.read_at
                                            ? ''
                                            : 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">

                                        <div className="min-w-0">

                                            {/* Notification type */}
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    isSafetyAlert
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                }`}
                                            >
                                                {isSafetyAlert
                                                    ? 'Community Safety Alert'
                                                    : 'Report Update'}
                                            </span>

                                            {/* Incident category */}
                                            <h2 className="mt-2 font-semibold text-gray-900 dark:text-white">
                                                {notification.data.category ??
                                                    'Incident Notification'}
                                            </h2>

                                            {/* Notification message */}
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                {notification.data.message}
                                            </p>

                                            {/* Community alert information */}
                                            {isSafetyAlert && (
                                                <div className="mt-3 space-y-2">

                                                    {severity && (
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                                            Severity:{' '}
                                                            <span className="font-semibold">
                                                                {severity}
                                                            </span>
                                                        </p>
                                                    )}

                                                    {isHighPriority && (
                                                        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                                                            High Priority
                                                        </span>
                                                    )}

                                                    {notification.data.incident_date && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Incident Date:{' '}
                                                            {notification.data.incident_date}
                                                        </p>
                                                    )}

                                                    {notification.data.approximate_area && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Area:{' '}
                                                            {notification.data.approximate_area}
                                                        </p>
                                                    )}

                                                    <Link
                                                        href={notification.data.link ?? '/safety-map'}
                                                        className="inline-block text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                                                    >
                                                        View Safety Map
                                                    </Link>
                                                </div>
                                            )}

                                            {/* Private report rejection reason */}
                                            {!isSafetyAlert &&
                                                notification.data.reason && (
                                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                        Reason:{' '}
                                                        {notification.data.reason}
                                                    </p>
                                                )}

                                            {/* Notification date */}
                                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(
                                                    notification.created_at,
                                                ).toLocaleString('en-PH')}
                                            </p>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.read_at && (
                                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                New
                                            </span>
                                        )}
                                    </div>

                                    {/* Mark individual notification as read */}
                                    {!notification.read_at && (
                                        <button
                                            onClick={() =>
                                                router.patch(
                                                    `/notifications/${notification.id}/read`,
                                                )
                                            }
                                            className="mt-3 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </article>
                            );
                        })
                    )}
                </section>

                {/* Pagination */}
                {notifications.links.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-2">
                        {notifications.links.map((link, index) =>
                            link.url ? (
                                <Link
                                    key={index}
                                    href={link.url}
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        link.active
                                            ? 'bg-emerald-700 text-white'
                                            : 'border-gray-300 dark:border-gray-700'
                                    }`}
                                >
                                    {link.label
                                        .replace(/&laquo;|&raquo;/g, '')
                                        .replace(/<[^>]*>/g, '')
                                        .trim()}
                                </Link>
                            ) : null,
                        )}php artisan test
                    </nav>
                )}
            </main>
        </>
    );
}
