import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

type AuditActor = {
    id: number;
    name: string;
    role: string;
};

type Reporter = {
    id: number;
    name: string;
};

type AuditIncident = {
    id: number;
    category: string;
    incident_date: string;
    location_description: string;
    reporter: Reporter | null;
};

type AuditHistoryEntry = {
    id: number;
    incident_id: number;
    changed_by: number | null;
    old_status: string | null;
    new_status: string;
    severity: string | null;
    reason: string | null;
    created_at: string;
    actor: AuditActor | null;
    incident: AuditIncident | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    history: {
        data: AuditHistoryEntry[];
        links: PaginationLink[];
        total: number;
        from: number | null;
        to: number | null;
    };

    filters: {
        from: string;
        to: string;
        status: string;
        category: string;
    };

    categories: string[];
    statuses: string[];
};

// Display readable status labels.
function formatStatus(status: string): string {
    return status
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Display dates using the Philippine locale.
function formatDateTime(date: string): string {
    return new Date(date).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

// Display the original incident date.
function formatIncidentDate(date: string): string {
    return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(
        'en-PH',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        },
    );
}

// Use consistent status colors throughout the audit trail.
function getStatusStyle(status: string): string {
    const styles: Record<string, string> = {
        pending:
            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        under_review:
            'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        verified:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        rejected:
            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
        archived:
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    return (
        styles[status] ??
        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    );
}

export default function IncidentAuditTrail({
    history,
    filters,
    categories,
    statuses,
}: Props) {
    // Keep filter inputs synchronized with Laravel's selected filters.
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [status, setStatus] = useState(filters.status);
    const [category, setCategory] = useState(filters.category);

    // Submit the selected filters to the audit trail endpoint.
    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            '/admin/audit-trail',
            {
                from,
                to,
                status,
                category,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    return (
        <>
            <Head title="Incident Audit Trail | KalyeWatch" />

            <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
                {/* Page heading and administrator navigation. */}
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                            Administration
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                            Incident Audit Trail
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Review the complete record of incident status
                            changes and administrator actions.
                        </p>
                    </div>

                    <Link
                        href="/admin/incidents"
                        className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        Review Reports
                    </Link>
                </header>

                {/* Total number of history records. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total recorded status changes
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {history.total.toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Showing {history.from ?? 0}–{history.to ?? 0} of{' '}
                        {history.total} records
                    </p>
                </section>

                {/* Audit trail filters. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
                        Filter Audit Records
                    </h2>

                    <form
                        onSubmit={applyFilters}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
                    >
                        <div>
                            <label
                                htmlFor="audit-from"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                From
                            </label>

                            <input
                                id="audit-from"
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(event) =>
                                    setFrom(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="audit-to"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                To
                            </label>

                            <input
                                id="audit-to"
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(event) => setTo(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="audit-status"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                New Status
                            </label>

                            <select
                                id="audit-status"
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="">All Statuses</option>

                                {statuses.map((item) => (
                                    <option key={item} value={item}>
                                        {formatStatus(item)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="audit-category"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Category
                            </label>

                            <select
                                id="audit-category"
                                value={category}
                                onChange={(event) =>
                                    setCategory(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="">All Categories</option>

                                {categories.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                className="flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                                Apply Filters
                            </button>

                            <Link
                                href="/admin/audit-trail"
                                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Reset
                            </Link>
                        </div>
                    </form>

                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        Date filters use the date when an action was recorded,
                        not the original incident date.
                    </p>
                </section>

                {/* Incident status history records. */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Status Change History
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Newest actions appear first.
                        </p>
                    </div>

                    {history.data.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                No audit records found
                            </h3>

                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Try changing your filters or check again after
                                incident activity has been recorded.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                            {history.data.map((entry) => (
                                <article
                                    key={entry.id}
                                    className="p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                                                Audit Record #{entry.id}
                                            </p>

                                            <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">
                                                Report #{entry.incident_id}
                                                {' — '}
                                                {entry.incident?.category ??
                                                    'Incident unavailable'}
                                            </h3>

                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                {entry.incident
                                                    ?.location_description ??
                                                    'Location unavailable'}
                                            </p>
                                        </div>

                                        <span
                                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(entry.new_status)}`}
                                        >
                                            {formatStatus(entry.new_status)}
                                        </span>
                                    </div>

                                    {/* Previous and new status. */}
                                    <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Status transition
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                            {entry.old_status
                                                ? formatStatus(entry.old_status)
                                                : 'Initial submission'}

                                            <span className="mx-2 text-gray-400">
                                                →
                                            </span>

                                            {formatStatus(entry.new_status)}
                                        </p>
                                    </div>

                                    {/* Action details. */}
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Performed by
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {entry.actor?.name ??
                                                    'Account unavailable'}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {entry.actor?.role
                                                    ? formatStatus(
                                                          entry.actor.role,
                                                      )
                                                    : 'Role unavailable'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Action recorded
                                            </p>

                                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                {formatDateTime(
                                                    entry.created_at,
                                                )}
                                            </p>
                                        </div>

                                        {entry.incident && (
                                            <>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        Original incident date
                                                    </p>

                                                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                        {formatIncidentDate(
                                                            entry.incident
                                                                .incident_date,
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        Submitted by
                                                    </p>

                                                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                        {entry.incident.reporter
                                                            ?.name ??
                                                            'Account unavailable'}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {entry.severity && (
                                        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">
                                                Severity:
                                            </span>{' '}
                                            {entry.severity}
                                        </p>
                                    )}

                                    {/* Explanation recorded during the transition. */}
                                    <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Action reason
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                            {entry.reason ??
                                                'No reason was provided.'}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* History pagination. */}
                    {history.links.length > 3 && (
                        <nav
                            aria-label="Audit trail pagination"
                            className="flex flex-wrap justify-center gap-2 border-t border-gray-200 p-4 dark:border-gray-800"
                        >
                            {history.links.map((link, index) => {
                                const label = link.label
                                    .replace('&laquo;', '')
                                    .replace('&raquo;', '')
                                    .replace(/<[^>]*>/g, '')
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

                <footer className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                    <strong>Audit information:</strong> These records reflect
                    incident status changes stored by KalyeWatch. Deleted user
                    accounts may appear as unavailable. This page displays
                    existing history records and does not modify incident
                    information.
                </footer>
            </main>
        </>
    );
}
