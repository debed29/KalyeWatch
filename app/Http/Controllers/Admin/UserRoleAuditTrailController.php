<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserRoleHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserRoleAuditTrailController extends Controller
{
    /**
     * Ensure that only administrators can access role history.
     */
    private function authorizeAdministrator(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only administrators can access the user role audit trail.'
        );
    }

    /**
     * Display the historical record of administrator role changes.
     *
     * Supports searching by account or administrator details,
     * filtering by date range, previous role, and new role.
     */
    public function index(Request $request): Response
    {
        $this->authorizeAdministrator($request);

        // Validate the optional audit trail filters.
        $filters = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
            'from' => [
                'nullable',
                'date_format:Y-m-d',
            ],
            'to' => [
                'nullable',
                'date_format:Y-m-d',
            ],
            'old_role' => [
                'nullable',
                'in:community_user,administrator',
            ],
            'new_role' => [
                'nullable',
                'in:community_user,administrator',
            ],
        ]);

        // Ensure that the selected date range is valid.
        if (
            isset($filters['from'], $filters['to'])
            && Carbon::parse($filters['from'])
                ->greaterThan(Carbon::parse($filters['to']))
        ) {
            throw ValidationException::withMessages([
                'from' => 'The start date must be before or equal to the end date.',
            ]);
        }

        // Retrieve the audit records using stored identity snapshots.
        $query = UserRoleHistory::query()
            ->select([
                'id',
                'user_id',
                'user_name',
                'user_email',
                'actor_user_id',
                'actor_name',
                'actor_email',
                'old_role',
                'new_role',
                'reason',
                'created_at',
            ]);

        // Search the affected account and the administrator.
        if (! empty($filters['search'])) {
            $search = trim($filters['search']);

            $query->where(function ($historyQuery) use ($search): void {
                $historyQuery
                    ->where('user_name', 'like', "%{$search}%")
                    ->orWhere('user_email', 'like', "%{$search}%")
                    ->orWhere('actor_name', 'like', "%{$search}%")
                    ->orWhere('actor_email', 'like', "%{$search}%");
            });
        }

        // Filter by the date the role change was recorded.
        if (isset($filters['from'])) {
            $query->whereDate(
                'created_at',
                '>=',
                $filters['from']
            );
        }

        if (isset($filters['to'])) {
            $query->whereDate(
                'created_at',
                '<=',
                $filters['to']
            );
        }

        // Filter by the previous account role.
        if (isset($filters['old_role'])) {
            $query->where(
                'old_role',
                $filters['old_role']
            );
        }

        // Filter by the newly assigned account role.
        if (isset($filters['new_role'])) {
            $query->where(
                'new_role',
                $filters['new_role']
            );
        }

        // Display the newest role changes first.
        // The ID provides a consistent order for identical timestamps.
        $history = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/user-role-audit-trail/index', [
            'history' => $history,

            'filters' => [
                'search' => $filters['search'] ?? '',
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
                'old_role' => $filters['old_role'] ?? '',
                'new_role' => $filters['new_role'] ?? '',
            ],

            'roles' => [
                'community_user',
                'administrator',
            ],
        ]);
    }
}
