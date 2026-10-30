<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(10);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'unreadCount' => $request->user()
                ->unreadNotifications()
                ->count(),
        ]);
    }

    public function markAsRead(
        Request $request,
        string $id
    ): RedirectResponse {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->firstOrFail();

        $notification->markAsRead();

        return back();
    }

    public function markAllAsRead(
        Request $request
    ): RedirectResponse {
        $request->user()
            ->unreadNotifications()
            ->update(['read_at' => now()]);

        return back();
    }
}
