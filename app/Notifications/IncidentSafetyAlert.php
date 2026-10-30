<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class IncidentSafetyAlert extends Notification
{
    use Queueable;

    /**
     * Store only the information safe for public community alerts.
     * Do not include reporter details, descriptions, exact coordinates,
     * or private evidence images.
     */
    public function __construct(
        public int $incidentId,
        public string $category,
        public string $severity,
        public string $incidentDate,
    ) {}

    /**
     * Save this notification in Laravel's existing notifications table.
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Define the information visible to community members.
     */
    public function toDatabase(object $notifiable): array
    {
        // High and Critical incidents require greater attention.
        $priority = in_array(
            $this->severity,
            ['High', 'Critical'],
            true
        ) ? 'high' : 'normal';

        return [
            'alert_type' => 'community_safety_alert',
            'incident_id' => $this->incidentId,
            'category' => $this->category,
            'severity' => $this->severity,
            'priority' => $priority,
            'incident_date' => $this->incidentDate,
            'approximate_area' => 'Barangay Panghulo, Malabon City',
            'message' => "A {$this->category} incident has been verified in Barangay Panghulo.",
            'link' => '/safety-map',
        ];
    }
}
