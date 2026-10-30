<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Share common data with all Inertia pages.
     *
     * This allows React components to access authenticated
     * user information and notification information.
     */
    public function share(Request $request): array
    {
        // Get the currently authenticated user.
        $user = $request->user();

        return [
            ...parent::share($request),

            // Share the application name.
            'name' => config('app.name'),

            // Share authenticated user information.
            'auth' => [
                'user' => $user,
            ],

            // Share the sidebar's open or closed state.
            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',

            // Share the actual number of unread notifications.
            // Guests receive zero because they are not authenticated.
            'unreadNotificationsCount' => fn () => $user
                ? $user->unreadNotifications()->count()
                : 0,

            // Share the five most recent notifications with the header dropdown.
            'recentNotifications' => fn () => $user
                ? $user->notifications()
                    ->latest()
                    ->take(5)
                    ->get()
                : [],
        ];
    }
}
