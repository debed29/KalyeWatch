<?php

use App\Http\Controllers\Admin\IncidentAnalyticsController;
use App\Http\Controllers\Admin\IncidentAuditTrailController;
use App\Http\Controllers\Admin\IncidentExportController;
use App\Http\Controllers\Admin\IncidentReviewController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\UserRoleAuditTrailController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PublicSafetyMapController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Authenticated and verified users can access their own incident reports.
Route::middleware(['auth', 'verified'])->group(function () {
    // Display the dashboard without requiring a team slug.
    Route::get('/dashboard', DashboardController::class)
        ->name('dashboard');

    Route::get('/incidents', [
        IncidentController::class,
        'index',
    ])->name('incidents.index');

    Route::get('/incidents/create', [
        IncidentController::class,
        'create',
    ])->name('incidents.create');

    Route::post('/incidents', [
        IncidentController::class,
        'store',
    ])->name('incidents.store');

    // Display notifications and manage their read status.
    Route::get('/notifications', [
        NotificationController::class,
        'index',
    ])->name('notifications.index');

    Route::patch('/notifications/{id}/read', [
        NotificationController::class,
        'markAsRead',
    ])->name('notifications.read');

    Route::patch('/notifications/read-all', [
        NotificationController::class,
        'markAllAsRead',
    ])->name('notifications.read-all');
});

// Public safety map remains accessible without signing in.
Route::get('/safety-map', PublicSafetyMapController::class)
    ->name('safety-map.index');

// Only authenticated and verified users can access admin routes.
// Individual controllers enforce administrator role authorization.
Route::middleware(['auth', 'verified'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        // Display administrator-only incident analytics.
        Route::get('/analytics', IncidentAnalyticsController::class)
            ->name('analytics');

        // Display the system-wide incident audit trail.
        Route::get('/audit-trail', [
            IncidentAuditTrailController::class,
            'index',
        ])->name('audit-trail.index');

        // Display the administrator user role audit trail.
        Route::get('/user-role-audit-trail', [
            UserRoleAuditTrailController::class,
            'index',
        ])->name('user-role-audit-trail.index');
        // Display the administrator user directory.
        Route::get('/users', [
            UserManagementController::class,
            'index',
        ])->name('users.index');

        // Update a user's role.
        Route::patch('/users/{user}/role', [
            UserManagementController::class,
            'updateRole',
        ])->name('users.update-role');

        // Download filtered incident reports as a CSV file.
        Route::get('/incidents/export', IncidentExportController::class)
            ->name('incidents.export');

        // Display the administrator incident review queue.
        Route::get('/incidents', [
            IncidentReviewController::class,
            'index',
        ])->name('incidents.index');

        // Display private evidence images.
        Route::get('/incidents/{incident}/evidence/{image}', [
            IncidentReviewController::class,
            'evidence',
        ])->name('incidents.evidence');

        // Mark a pending report as being reviewed.
        Route::post('/incidents/{incident}/under-review', [
            IncidentReviewController::class,
            'markUnderReview',
        ])->name('incidents.under-review');

        // Verify an incident report.
        Route::post('/incidents/{incident}/verify', [
            IncidentReviewController::class,
            'verify',
        ])->name('incidents.verify');

        // Reject an incident report.
        Route::post('/incidents/{incident}/reject', [
            IncidentReviewController::class,
            'reject',
        ])->name('incidents.reject');
    });

// Load profile, security, and appearance settings routes.
require __DIR__.'/settings.php';
