<?php

use App\Http\Controllers\Admin\IncidentReviewController;
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
Route::middleware(['auth', 'verified'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/incidents', [
            IncidentReviewController::class,
            'index',
        ])->name('incidents.index');

        Route::get('/incidents/{incident}/evidence/{image}', [
            IncidentReviewController::class,
            'evidence',
        ])->name('incidents.evidence');

        Route::post('/incidents/{incident}/verify', [
            IncidentReviewController::class,
            'verify',
        ])->name('incidents.verify');

        Route::post('/incidents/{incident}/reject', [
            IncidentReviewController::class,
            'reject',
        ])->name('incidents.reject');
    });

// Load profile, security, and appearance settings routes.
require __DIR__.'/settings.php';
