import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    email_verified_at: string | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    users: {
        data: User[];
        links: PaginationLink[];
        total: number;
        from: number | null;
        to: number | null;
    };

    filters: {
        search: string;
        role: string;
    };

    roles: string[];
    currentUserId: number;
};

type SharedPageProps = {
    flash?: {
        success?: string;
    };
    errors?: Record<string, string>;
};

// Format role labels for display.
function formatRole(role: string): string {
    return role
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Format account registration dates.
function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Display consistent role colors.
function getRoleStyle(role: string): string {
    return role === 'administrator'
        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
}

// Allow administrators to change another user's role.
function UserRoleEditor({
    user,
    currentUserId,
}: {
    user: User;
    currentUserId: number;
}) {
    const form = useForm({
        role: user.role,
        reason: '',
    });

    const isCurrentUser = user.id === currentUserId;
    const hasRoleChange = form.data.role !== user.role;

    function updateRole(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!hasRoleChange || isCurrentUser || form.processing) {
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to change ${user.name}'s role from ${formatRole(user.role)} to ${formatRole(form.data.role)}?`,
        );

        if (!confirmed) {
            return;
        }

        form.patch(`/admin/users/${user.id}/role`, {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('reason', '');
            },
        });
    }

    return (
        <form onSubmit={updateRole} className="min-w-52 space-y-2">
            {isCurrentUser ? (
                <div>
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleStyle(user.role)}`}
                    >
                        {formatRole(user.role)}
                    </span>

                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Your own role cannot be changed here.
                    </p>
                </div>
            ) : (
                <>
                    <select
                        aria-label={`Change role for ${user.name}`}
                        value={form.data.role}
                        onChange={(event) =>
                            form.setData('role', event.target.value)
                        }
                        disabled={form.processing}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                        <option value="community_user">Community User</option>

                        <option value="administrator">Administrator</option>
                    </select>

                    <input
                        type="text"
                        value={form.data.reason}
                        onChange={(event) =>
                            form.setData('reason', event.target.value)
                        }
                        maxLength={1000}
                        placeholder="Reason (optional)"
                        disabled={form.processing}
                        aria-label={`Reason for changing ${user.name}'s role`}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />

                    {form.errors.role && (
                        <p
                            role="alert"
                            className="text-xs text-red-600 dark:text-red-400"
                        >
                            {form.errors.role}
                        </p>
                    )}

                    {form.errors.reason && (
                        <p
                            role="alert"
                            className="text-xs text-red-600 dark:text-red-400"
                        >
                            {form.errors.reason}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!hasRoleChange || form.processing}
                        className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? 'Updating...' : 'Save Role'}
                    </button>
                </>
            )}
        </form>
    );
}

export default function UserManagement({
    users,
    filters,
    currentUserId,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [role, setRole] = useState(filters.role);

    const page = usePage();
    const sharedProps = page.props as typeof page.props & SharedPageProps;

    const success = sharedProps.flash?.success;
    const filterError = sharedProps.errors?.search;

    // Apply account search and role filters.
    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            '/admin/users',
            {
                search,
                role,
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
            <Head title="User Management | KalyeWatch" />

            <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                            Administration
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                            User Management
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Manage registered community accounts and
                            administrator access.
                        </p>
                    </div>

                    <Link
                        href="/admin/audit-trail"
                        className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        Incident Audit Trail
                    </Link>
                </header>

                {success && (
                    <div
                        role="status"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                        {success}
                    </div>
                )}

                {filterError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                    >
                        {filterError}
                    </div>
                )}

                {/* Account statistics. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total registered accounts
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {users.total.toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Showing {users.from ?? 0}–{users.to ?? 0} of{' '}
                        {users.total} accounts
                    </p>
                </section>

                {/* Search and role filters. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
                        Search and Filter Accounts
                    </h2>

                    <form
                        onSubmit={applyFilters}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <div>
                            <label
                                htmlFor="user-search"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Search
                            </label>

                            <input
                                id="user-search"
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
                                htmlFor="user-role-filter"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Account Role
                            </label>

                            <select
                                id="user-role-filter"
                                value={role}
                                onChange={(event) =>
                                    setRole(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="">All Roles</option>
                                <option value="community_user">
                                    Community User
                                </option>
                                <option value="administrator">
                                    Administrator
                                </option>
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
                                href="/admin/users"
                                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Reset
                            </Link>
                        </div>
                    </form>
                </section>

                {/* Registered user directory. */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Registered Accounts
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            New accounts receive the Community User role by
                            default.
                        </p>
                    </div>

                    {users.data.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                No accounts found
                            </h3>

                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Try changing your search terms or account
                                filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-gray-50 text-xs tracking-wider text-gray-500 uppercase dark:bg-gray-900 dark:text-gray-400">
                                    <tr>
                                        <th className="px-5 py-4">Account</th>
                                        <th className="px-5 py-4">
                                            Verification
                                        </th>
                                        <th className="px-5 py-4">
                                            Registered
                                        </th>
                                        <th className="px-5 py-4">
                                            Manage Role
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {users.data.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="align-top transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {user.name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {user.email}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                    Account #{user.id}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                {user.email_verified_at ? (
                                                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                        Unverified
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                                {formatDate(user.created_at)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <UserRoleEditor
                                                    user={user}
                                                    currentUserId={
                                                        currentUserId
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination. */}
                    {users.links.length > 3 && (
                        <nav
                            aria-label="User account pagination"
                            className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-200 p-4 dark:border-gray-800"
                        >
                            {users.links.map((link, index) => {
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
                    <strong>Security reminder:</strong> Only authorized
                    administrators can change account roles. Administrators
                    cannot change their own roles or demote the last
                    administrator. Role changes are recorded in the user role
                    audit history.
                </footer>
            </main>
        </>
    );
}
