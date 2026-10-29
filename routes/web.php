<?php
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\IncidentReviewController;
use App\Http\Controllers\PublicSafetyMapController;

Route::inertia('/', 'welcome')->name('home');
Route::get('/incidents', [
    IncidentController::class,
    'index',
])->name('incidents.index');
Route::get('/safety-map', PublicSafetyMapController::class)
    ->name('safety-map.index');
    
Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
    });
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/incidents/create', [
        IncidentController::class,
        'create',
    ])->name('incidents.create');

    Route::post('/incidents', [
        IncidentController::class,
        'store',
    ])->name('incidents.store');
});

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
Route::middleware(['auth', 'verified'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/incidents', [
            IncidentReviewController::class,
            'index',
        ])->name('incidents.index');

        Route::post('/incidents/{incident}/verify', [
            IncidentReviewController::class,
            'verify',
        ])->name('incidents.verify');

        Route::post('/incidents/{incident}/reject', [
            IncidentReviewController::class,
            'reject',
        ])->name('incidents.reject');
    });