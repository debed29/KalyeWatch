<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the KalyeWatch dashboard.
     */
    public function __invoke(): Response
    {
        // Render the dashboard without Team invitation data.
        return Inertia::render('dashboard');
    }
}
