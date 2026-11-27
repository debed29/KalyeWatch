<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Insert a user role history record for feature tests.
 *
 * @param  array<string, mixed>  $overrides
 */
function createKalyeWatchUserRoleHistoryRecord(array $overrides = []): int
{
    return (int) DB::table('user_role_histories')->insertGetId(array_merge([
        'user_id' => null,
        'user_name' => 'Maria Santos',
        'user_email' => 'maria@example.com',
        'actor_user_id' => null,
        'actor_name' => 'Administrator',
        'actor_email' => 'admin@example.com',
        'old_role' => 'community_user',
        'new_role' => 'administrator',
        'reason' => 'Authorized role change.',
        'created_at' => now()->toDateTimeString(),
    ], $overrides));
}

// Guests must sign in before accessing the user role audit trail.
test('guests cannot access the user role audit trail', function () {
    $this->get(route('admin.user-role-audit-trail.index'))
        ->assertRedirect(route('login'));
});

// Community users cannot access administrator role history.
test('community users cannot access the user role audit trail', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($communityUser)
        ->get(route('admin.user-role-audit-trail.index'))
        ->assertForbidden();
});

// Administrators can view historical role changes.
test('administrators can view the user role audit trail', function () {
    $admin = User::factory()->create([
        'name' => 'Main Administrator',
        'role' => 'administrator',
    ]);

    $member = User::factory()->create([
        'name' => 'Maria Santos',
        'email' => 'maria@example.com',
        'role' => 'community_user',
    ]);

    $historyId = createKalyeWatchUserRoleHistoryRecord([
        'user_id' => $member->id,
        'user_name' => $member->name,
        'user_email' => $member->email,
        'actor_user_id' => $admin->id,
        'actor_name' => $admin->name,
        'actor_email' => $admin->email,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/user-role-audit-trail/index')
            ->where('history.total', 1)
            ->has('history.data', 1)
            ->where('history.data.0.id', $historyId)
            ->where('history.data.0.user_name', 'Maria Santos')
            ->where('history.data.0.user_email', 'maria@example.com')
            ->where('history.data.0.actor_name', 'Main Administrator')
            ->where('history.data.0.old_role', 'community_user')
            ->where('history.data.0.new_role', 'administrator')
            ->where('history.data.0.reason', 'Authorized role change.')
            ->where('filters.search', '')
            ->where('filters.old_role', '')
            ->where('filters.new_role', '')
            ->has('roles', 2)
        );
});

// Administrators can search affected users and acting administrators.
test('administrators can search role history by user or administrator details', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    createKalyeWatchUserRoleHistoryRecord([
        'user_name' => 'Maria Santos',
        'user_email' => 'maria@example.com',
        'actor_name' => 'Pedro Administrator',
        'actor_email' => 'pedro-admin@example.com',
    ]);

    createKalyeWatchUserRoleHistoryRecord([
        'user_name' => 'Juan Dela Cruz',
        'user_email' => 'juan@example.com',
        'actor_name' => 'Ana Administrator',
        'actor_email' => 'ana-admin@example.com',
    ]);

    // Search using the affected user's name.
    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index', [
            'search' => 'Maria Santos',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('history.total', 1)
            ->where('history.data.0.user_name', 'Maria Santos')
            ->where('filters.search', 'Maria Santos')
        );

    // Search using the acting administrator's email.
    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index', [
            'search' => 'ana-admin@example.com',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('history.total', 1)
            ->where('history.data.0.actor_email', 'ana-admin@example.com')
        );
});

// Administrators can filter role history by date and role transition.
test('administrators can filter role history by date and previous or new role', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    createKalyeWatchUserRoleHistoryRecord([
        'user_name' => 'Matching Record',
        'old_role' => 'community_user',
        'new_role' => 'administrator',
        'created_at' => '2026-03-15 10:00:00',
    ]);

    createKalyeWatchUserRoleHistoryRecord([
        'user_name' => 'Wrong Role',
        'old_role' => 'administrator',
        'new_role' => 'community_user',
        'created_at' => '2026-03-15 11:00:00',
    ]);

    createKalyeWatchUserRoleHistoryRecord([
        'user_name' => 'Outside Date Range',
        'old_role' => 'community_user',
        'new_role' => 'administrator',
        'created_at' => '2026-04-01 10:00:00',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index', [
            'from' => '2026-03-01',
            'to' => '2026-03-31',
            'old_role' => 'community_user',
            'new_role' => 'administrator',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('history.total', 1)
            ->where('history.data.0.user_name', 'Matching Record')
            ->where('filters.from', '2026-03-01')
            ->where('filters.to', '2026-03-31')
            ->where('filters.old_role', 'community_user')
            ->where('filters.new_role', 'administrator')
        );
});

// The start date must not be later than the end date.
test('date range validation rejects a start date after the end date', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index', [
            'from' => '2026-04-01',
            'to' => '2026-03-01',
        ]))
        ->assertSessionHasErrors('from');
});

// Role history is ordered newest first and uses 15 records per page.
test('administrators can paginate role history with newest records first', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $historyIds = [];

    for ($i = 1; $i <= 17; $i++) {
        $historyIds[] = createKalyeWatchUserRoleHistoryRecord([
            'user_name' => "User {$i}",
            'created_at' => now()
                ->subDays($i)
                ->toDateTimeString(),
        ]);
    }

    // The first page contains the newest 15 records.
    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('history.total', 17)
            ->has('history.data', 15)
            ->where('history.data.0.id', $historyIds[0])
            ->where('history.data.14.id', $historyIds[14])
        );

    // The second page contains the remaining two oldest records.
    $this->actingAs($admin)
        ->get(route('admin.user-role-audit-trail.index', [
            'page' => 2,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('history.total', 17)
            ->has('history.data', 2)
            ->where('history.data.0.id', $historyIds[15])
            ->where('history.data.1.id', $historyIds[16])
        );
});
