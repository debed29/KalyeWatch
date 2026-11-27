<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

// Guests must sign in before accessing user management.
test('guests cannot access user management', function () {
    $this->get(route('admin.users.index'))
        ->assertRedirect(route('login'));
});

// Community users cannot access the administrator user directory.
test('community users cannot access user management', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($communityUser)
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

// Community users cannot change another account's role.
test('community users cannot update account roles', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $target = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($communityUser)
        ->patch(route('admin.users.update-role', $target), [
            'role' => 'administrator',
        ])
        ->assertForbidden();

    expect($target->fresh()->role)->toBe('community_user');

    $this->assertDatabaseCount('user_role_histories', 0);
});

// Administrators can view registered accounts.
test('administrators can view the user directory', function () {
    $admin = User::factory()->create([
        'name' => 'KalyeWatch Administrator',
        'role' => 'administrator',
    ]);

    $communityUser = User::factory()->create([
        'name' => 'Community Member',
        'role' => 'community_user',
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.users.index'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/users/index')
        ->where('users.total', 2)
        ->has('users.data', 2)
        ->where('filters.search', '')
        ->where('filters.role', '')
        ->where('currentUserId', $admin->id)
        ->where('users.data.0.id', $communityUser->id)
        ->where('users.data.1.id', $admin->id)
    );
});

// Administrators can search accounts by name or email.
test('administrators can search accounts by name or email', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $target = User::factory()->create([
        'name' => 'Maria Santos',
        'email' => 'maria@example.com',
        'role' => 'community_user',
    ]);

    User::factory()->create([
        'name' => 'Pedro Cruz',
        'email' => 'pedro@example.com',
        'role' => 'community_user',
    ]);

    // Search using the account name.
    $this->actingAs($admin)
        ->get(route('admin.users.index', [
            'search' => 'Maria Santos',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->where('users.total', 1)
            ->where('users.data.0.id', $target->id)
            ->where('filters.search', 'Maria Santos')
        );

    // Search using the account email.
    $this->actingAs($admin)
        ->get(route('admin.users.index', [
            'search' => 'pedro@example.com',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->where('users.total', 1)
            ->where('users.data.0.email', 'pedro@example.com')
        );
});

// Administrators can filter accounts by role.
test('administrators can filter accounts by role', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $target = User::factory()->create([
        'role' => 'community_user',
    ]);

    $anotherAdmin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.users.index', [
            'role' => 'community_user',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->where('users.total', 1)
            ->where('users.data.0.id', $target->id)
            ->where('filters.role', 'community_user')
        );

    $this->actingAs($admin)
        ->get(route('admin.users.index', [
            'role' => 'administrator',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->where('users.total', 2)
            ->has('users.data', 2)
            ->where('filters.role', 'administrator')
        );

    expect($anotherAdmin->fresh()->role)->toBe('administrator');
});

// Administrators can promote community accounts.
test('administrators can promote community users and record the role change', function () {
    $admin = User::factory()->create([
        'name' => 'Main Administrator',
        'email' => 'admin@example.com',
        'role' => 'administrator',
    ]);

    $target = User::factory()->create([
        'name' => 'Community Member',
        'email' => 'member@example.com',
        'role' => 'community_user',
    ]);

    $response = $this->actingAs($admin)
        ->patch(route('admin.users.update-role', $target), [
            'role' => 'administrator',
            'reason' => 'Authorized system administrator appointment.',
        ]);

    $response
        ->assertRedirect()
        ->assertSessionHas(
            'success',
            'User role updated successfully. The action was recorded.'
        );

    expect($target->fresh()->role)->toBe('administrator');

    $this->assertDatabaseHas('user_role_histories', [
        'user_id' => $target->id,
        'user_name' => 'Community Member',
        'user_email' => 'member@example.com',
        'actor_user_id' => $admin->id,
        'actor_name' => 'Main Administrator',
        'actor_email' => 'admin@example.com',
        'old_role' => 'community_user',
        'new_role' => 'administrator',
        'reason' => 'Authorized system administrator appointment.',
    ]);

    $this->assertDatabaseCount('user_role_histories', 1);
});

// An administrator can demote another administrator if another administrator remains.
test('administrators can demote another administrator', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $target = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update-role', $target), [
            'role' => 'community_user',
            'reason' => 'Administrative access is no longer required.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($target->fresh()->role)->toBe('community_user');

    expect(
        User::query()
            ->where('role', 'administrator')
            ->count()
    )->toBe(1);

    $this->assertDatabaseHas('user_role_histories', [
        'user_id' => $target->id,
        'actor_user_id' => $admin->id,
        'old_role' => 'administrator',
        'new_role' => 'community_user',
    ]);
});

// Administrators cannot remove their own administrator access.
test('administrators cannot demote themselves', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update-role', $admin), [
            'role' => 'community_user',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('role');

    expect($admin->fresh()->role)->toBe('administrator');

    $this->assertDatabaseCount('user_role_histories', 0);
});

// An administrator cannot demote the sole administrator account.
test('the only administrator cannot lose administrator access', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    // The only administrator cannot change their own role.
    $this->actingAs($admin)
        ->patch(route('admin.users.update-role', $admin), [
            'role' => 'community_user',
        ])
        ->assertSessionHasErrors('role');

    expect(
        User::query()
            ->where('role', 'administrator')
            ->count()
    )->toBe(1);

    expect($admin->fresh()->role)->toBe('administrator');

    $this->assertDatabaseCount('user_role_histories', 0);
});

// Invalid roles must be rejected.
test('administrators cannot assign invalid roles', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $target = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update-role', $target), [
            'role' => 'super_admin',
        ])
        ->assertSessionHasErrors('role');

    expect($target->fresh()->role)->toBe('community_user');

    $this->assertDatabaseCount('user_role_histories', 0);
});

// An unchanged role must not create an unnecessary audit entry.
test('unchanged roles do not create audit records', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $target = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update-role', $target), [
            'role' => 'community_user',
        ])
        ->assertRedirect()
        ->assertSessionHas(
            'success',
            'The account already has the selected role.'
        );

    expect($target->fresh()->role)->toBe('community_user');

    $this->assertDatabaseCount('user_role_histories', 0);
});
