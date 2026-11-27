import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

type UserRoleHistoryEntry = {
    id: number;
    user_id: number | null;
    user_name: string;
    user_email: string;
    actor_user_id: number | null;
    actor_name: string | null;
    actor_email: string | null;
    old_role: string;
    new_role: string;
    reason: string | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    history: {
        data: UserRoleHistoryEntry[];
        links: PaginationLink[];
        total: number;
        from: number | null;
        to: number | null;
    };

    filters: {
        search: string;
        from: string;
        to: string;
        old_role: string;
        new_role: string;
    };

    roles: string[];
};

// Convert role values into readable labels.
function formatRole(role: string): string {
    return role
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Display consistent role colors.
function getRoleStyle(role: string): string {
    return role === 'administrator'
        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
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

export default function UserRoleAuditTrail({ history, filters, roles }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [oldRole, setOldRole] = useState(filters.old_role);
    const [newRole, setNewRole] = useState(filters.new_role);

    // Apply the selected search and filters.
    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            '/admin/user-role-audit-trail',
            {
                search,
                from,
                to,
                old_role: oldRole,
                new_role: newRole,
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
            <Head title="User Role Audit Trail | KalyeWatch" />

            <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
                {/* Page heading. */}
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                            Administration
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                            User Role Audit Trail
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Review historical changes to community user and
                            administrator roles.
                        </p>
                    </div>

                    <Link
                        href="/admin/users"
                        className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        User Management
                    </Link>
                </header>

                {/* Total recorded role changes. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total recorded role changes
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {history.total.toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Showing {history.from ?? 0}–{history.to ?? 0} of{' '}
                        {history.total} records
                    </p>
                </section>

                {/* Search and filter controls. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
                        Search and Filter Role Changes
                    </h2>

                    <form
                        onSubmit={applyFilters}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    >
                        <div>
                            <label
                                htmlFor="role-audit-search"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Search User or Administrator
                            </label>

                            <input
                                id="role-audit-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                maxLength={100}
                                placeholder="Name or email address"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="role-audit-from"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                From
                            </label>

                            <input
                                id="role-audit-from"
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
                                htmlFor="role-audit-to"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                To
                            </label>

                            <input
                                id="role-audit-to"
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(event) => setTo(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="role-audit-old-role"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Previous Role
                            </label>

                            <select
                                id="role-audit-old-role"
                                value={oldRole}
                                onChange={(event) =>
                                    setOldRole(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="">All Previous Roles</option>

                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {formatRole(role)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="role-audit-new-role"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                New Role
                            </label>

                            <select
                                id="role-audit-new-role"
                                value={newRole}
                                onChange={(event) =>
                                    setNewRole(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="">All New Roles</option>

                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {formatRole(role)}
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
                                href="/admin/user-role-audit-trail"
                                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Reset
                            </Link>
                        </div>
                    </form>
                </section>

                {/* Historical role changes. */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Role Change History
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Newest role changes appear first.
                        </p>
                    </div>

                    {history.data.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                No role change records found
                            </h3>

                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Try changing your search terms or filters.
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
                                        <div>
                                            <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                                                Audit Record #{entry.id}
                                            </p>

                                            <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">
                                                {entry.user_name}
                                            </h3>

                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                {entry.user_email}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                                {entry.user_id
                                                    ? `User Account #${entry.user_id}`
                                                    : 'Historical account snapshot'}
                                            </p>
                                        </div>

                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {formatDateTime(entry.created_at)}
                                        </p>
                                    </div>

                                    {/* Previous and new roles. */}
                                    <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Role Transition
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleStyle(entry.old_role)}`}
                                            >
                                                {formatRole(entry.old_role)}
                                            </span>

                                            <span className="text-gray-400">
                                                →
                                            </span>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleStyle(entry.new_role)}`}
                                            >
                                                {formatRole(entry.new_role)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Administrator who performed the change. */}
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Changed By
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                                {entry.actor_name ??
                                                    'Account unavailable'}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {entry.actor_email ??
                                                    'No email available'}
                                            </p>

                                            {entry.actor_user_id === null && (
                                                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                                    Original account is no
                                                    longer available.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Reason for Change
                                            </p>

                                            <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                                {entry.reason ||
                                                    'No reason provided.'}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* Pagination. */}
                    {history.links.length > 3 && (
                        <nav
                            aria-label="User role audit trail pagination"
                            className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-200 p-4 dark:border-gray-800"
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
                    <strong>Audit information:</strong> This page displays
                    historical role changes. The recorded user and administrator
                    names and email addresses are retained as snapshots, even
                    when an associated account is no longer available.
                </footer>
            </main>
        </>
    );
}
