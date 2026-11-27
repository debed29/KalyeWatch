<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IncidentStatusEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $incidentId,
        public string $category,
        public string $status,
        public ?string $reason = null,
    ) {}

    /**
     * Send this notification through email only.
     *
     * The existing in-app notification is handled separately.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the incident status update email.
     */
    public function toMail(User $notifiable): MailMessage
    {
        $statusLabel = match ($this->status) {
            'under_review' => 'Under Review',
            'verified' => 'Verified',
            'rejected' => 'Rejected',
            default => 'Updated',
        };

        $message = match ($this->status) {
            'under_review' => 'An administrator has started reviewing your incident report.',

            'verified' => 'Your incident report has been verified by a KalyeWatch administrator.',

            'rejected' => 'Your incident report has been rejected by a KalyeWatch administrator.',

            default => 'The status of your incident report has been updated.',
        };

        $mail = (new MailMessage)
            ->subject("KalyeWatch: Your {$this->category} report is {$statusLabel}")
            ->greeting("Hello {$notifiable->name},")
            ->line($message)
            ->line("Report reference: #{$this->incidentId}");

        if ($this->status === 'rejected' && $this->reason !== null) {
            $mail->line("Reason for rejection: {$this->reason}");
        }

        return $mail
            ->action('View My Reports', route('incidents.index'))
            ->salutation('KalyeWatch Team');
    }
}
