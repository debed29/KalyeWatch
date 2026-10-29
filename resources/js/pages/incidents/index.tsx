
import { Head, Link } from '@inertiajs/react';

type Incident = {
    user_id: number;
    status_histories: StatusHistory[];
    id: number;
    category: string;
    incident_date: string;
    incident_time: string | null;
    location_description: string;
    description: string;
    status: string;
    severity: string | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};
type HistoryActor = {
    id: number;
    name: string;
};
type StatusHistory = {
    id: number;
    old_status: string | null;
    new_status: string;
    severity: string | null;
    reason: string | null;
    created_at: string;
    actor: HistoryActor | null;
};
type Props = {
    incidents: {
        data: Incident[];
        total: number;
        from: number | null;
        to: number | null;
        links: PaginationLink[];
    };
};

const statusStyles: Record<string, string> = {
    pending:
        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    under_review:
        'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    verified:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    rejected:
        'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    archived:
        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function formatStatus(status: string) {
    return status
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function MyReports({ incidents }: Props) {
    return (
        <>
            <Head title="My Reports | KalyeWatch" />

            <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                            Community safety
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                            My Reports
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            View your submitted incidents and their review status.
                        </p>
                    </div>

                    <Link
                        href="/incidents/create"
                        className="inline-flex w-fit items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                        + Submit Incident
                    </Link>
                </header>

                <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 p-5 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Your submissions
                        </h2>

                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {incidents.total}{' '}
                            {incidents.total === 1 ? 'report' : 'reports'}
                        </span>
                    </div>

                    {incidents.data.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                ▤
                            </div>

                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                                No reports yet
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600 dark:text-gray-400">
                                When you submit an incident report, it will
                                appear here so you can monitor its status.
                            </p>

                            <Link
                                href="/incidents/create"
                                className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                                Submit your first report
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                            {incidents.data.map((incident) => {
                                const normalizedStatus = incident.status
                                    .toLowerCase()
                                    .replaceAll(' ', '_');

                                return (
                                    <article
                                        key={incident.id}
                                        className="p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                                    >
                                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {incident.category}
                                                    </h3>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                            statusStyles[normalizedStatus] ??
                                                            statusStyles.pending
                                                        }`}
                                                    >
                                                        {formatStatus(incident.status)}
                                                    </span>
                                                </div>

                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                    {incident.location_description}
                                                </p>

                                                <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                                    {incident.description}
                                                </p>
                                            </div>

                                            <div className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(incident.incident_date)}
                                            </div>
                                        </div>

                                        {incident.severity && (
                                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                Assigned severity: {incident.severity}
                                            </p>
                                        )}

                                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                                            Report ID: #{incident.id}
                                        </p>
                                        
<div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-800">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        Status history
    </h4>

    {incident.status_histories?.length ? (
        <ol className="mt-4 space-y-4">
            {incident.status_histories.map((history) => (
                <li key={history.id} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                        <span className="h-3 w-3 rounded-full bg-emerald-600 ring-4 ring-emerald-50 dark:bg-emerald-400 dark:ring-emerald-950" />
                        <span className="mt-2 w-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <div className="min-w-0 flex-1 pb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {history.old_status
                                ? `${history.old_status.replaceAll('_', ' ')} → `
                                : ''}
                            {history.new_status.replaceAll('_', ' ')}
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(history.created_at).toLocaleString(
                                'en-PH',
                                {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                },
                            )}
                        </p>

                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Recorded by: {history.actor?.name ?? 'Account unavailable'}
                        </p>

                        {history.severity && (
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                Severity: {history.severity}
                            </p>
                        )}

                        {history.reason && (
                            <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
                                {history.reason}
                            </p>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    ) : (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            No status history has been recorded yet.
        </p>
    )}
</div>

                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {incidents.links.length > 3 && (
                        <nav
                            aria-label="Report pagination"
                            className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-200 p-4 dark:border-gray-800"
                        >
                            {incidents.links.map((link, index) => {
                                const label = link.label
                                    .replace('&laquo;', '')
                                    .replace('&raquo;', '')
                                    .trim();

                                const classes = `rounded-md border px-3 py-2 text-sm ${
                                    link.active
                                        ? 'border-emerald-700 bg-emerald-700 text-white'
                                        : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                                }`;

                                return link.url ? (
                                    <Link
                                        key={`${label}-${index}`}
                                        href={link.url}
                                        preserveScroll
                                        className={classes}
                                    >
                                        {label}
                                    </Link>
                                ) : (
                                    <span
                                        key={`${label}-${index}`}
                                        className={`${classes} cursor-not-allowed opacity-50`}
                                    >
                                        {label}
                                    </span>
                                );
                            })}
                        </nav>
                    )}
                </section>

                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                    Pending and under-review reports are not public.
                    Only verified incidents may be displayed on the public map.
                </p>
            </main>
        </>
    );
}
