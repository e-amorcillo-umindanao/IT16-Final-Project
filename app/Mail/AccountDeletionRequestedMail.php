<?php

namespace App\Mail;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountDeletionRequestedMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $cancelUrl;

    public function __construct(
        public User $user,
        public string $cancelToken,
        public CarbonInterface $scheduledFor,
    ) {
        $this->cancelUrl = route('account.cancel-deletion', $cancelToken);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your SecureVault account deletion has been scheduled',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-deletion-requested',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
