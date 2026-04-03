<?php

namespace App\Mail;

use App\Models\DataExport;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class DataExportReadyMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $downloadUrl;

    public function __construct(
        public User $user,
        public DataExport $export,
    ) {
        $this->downloadUrl = URL::temporarySignedRoute(
            'exports.download',
            now()->addHours(24),
            ['token' => $export->token],
        );
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your SecureVault data export is ready',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.data-export-ready',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
