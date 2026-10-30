<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class IncidentStatusUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public int $incidentId,
        public string $category,
        public string $status,
        public ?string $reason = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'incident_id' => $this->incidentId,
            'category' => $this->category,
            'status' => $this->status,
            'reason' => $this->reason,
            'message' => "Your {$this->category} report is now {$this->status}.",
        ];
    }
}
