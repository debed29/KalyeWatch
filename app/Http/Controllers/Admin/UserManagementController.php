<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRoleHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Ensure that only administrators can manage accounts.
     */
    private function authorizeAdministrator(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only administrators can manage user accounts.'
        );
    }

    /**
     * Display registered user accounts.
     *
     * Supports searching by name or email and filtering by role.
     */
    public function index(Request $request): Response
    {
        $this->authorizeAdministrator($request);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => [
                'nullable',
                'in:community_user,administrator',
            ],
        ]);

        $query = User::query()
            ->select([
                'id',
                'name',
                'email',
                'role',
                'email_verified_at',
                'created_at',
            ]);

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);

            $query->where(function ($userQuery) use ($search) {
                $userQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        $users = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/users/index', [
            'users' => $users,

            'filters' => [
                'search' => $filters['search'] ?? '',
                'role' => $filters['role'] ?? '',
            ],

            'roles' => [
                'community_user',
                'administrator',
            ],

            'currentUserId' => $request->user()->id,
        ]);
    }

    /**
     * Change a user's role and record the action.
     *
     * Protects against self-demotion and removal of the
     * last administrator.
     */
    public function updateRole(
        Request $request,
        User $user
    ): RedirectResponse {
        $this->authorizeAdministrator($request);

        $validated = $request->validate([
            'role' => [
                'required',
                'in:community_user,administrator',
            ],
            'reason' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $actorId = $request->user()->id;
        $newRole = $validated['role'];
        $reason = $validated['reason'] ?? null;

        $result = DB::transaction(function () use (
            $user,
            $actorId,
            $newRole,
            $reason
        ): string {
            /*
             * Lock administrator records before checking their count.
             * This helps prevent concurrent requests from removing
             * the last administrator.
             */
            $administrators = User::query()
                ->where('role', 'administrator')
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id', 'name', 'email', 'role']);

            // Confirm that the acting account is still an administrator.
            $actor = $administrators->first(
                fn (User $admin): bool => (int) $admin->id === (int) $actorId
            );

            if (! $actor) {
                abort(403, 'Administrator access is no longer available.');
            }

            // Retrieve the latest target account information.
            $target = User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Administrators cannot change their own roles.
            if ((int) $target->id === (int) $actorId) {
                return 'self';
            }

            $oldRole = $target->role;

            // Do not create an audit record for an unchanged role.
            if ($oldRole === $newRole) {
                return 'unchanged';
            }

            /*
             * Never allow the last administrator to lose
             * administrator privileges.
             */
            if (
                $oldRole === 'administrator'
                && $newRole === 'community_user'
                && $administrators->count() <= 1
            ) {
                return 'last_administrator';
            }

            // Update the role without relying on mass assignment.
            $target->forceFill([
                'role' => $newRole,
            ])->save();

            // Record the role change in the permanent audit history.
            UserRoleHistory::create([
                'user_id' => $target->id,
                'user_name' => $target->name,
                'user_email' => $target->email,

                'actor_user_id' => $actor->id,
                'actor_name' => $actor->name,
                'actor_email' => $actor->email,

                'old_role' => $oldRole,
                'new_role' => $newRole,
                'reason' => $reason,
            ]);

            return 'updated';
        }, attempts: 3);

        if ($result === 'self') {
            return back()->withErrors([
                'role' => 'You cannot change your own administrator role.',
            ]);
        }

        if ($result === 'last_administrator') {
            return back()->withErrors([
                'role' => 'The last administrator cannot be demoted.',
            ]);
        }

        if ($result === 'unchanged') {
            return back()->with(
                'success',
                'The account already has the selected role.'
            );
        }

        return back()->with(
            'success',
            'User role updated successfully. The action was recorded.'
        );
    }
}
