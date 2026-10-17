<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DeveloperAuditUnlockMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $unlockUrl,
        public string $expiresAt,
    ) {}

    public function build(): self
    {
        return $this
            ->subject('Your Hailab code audit report is ready')
            ->text('emails.developer-audit-unlock');
    }
}
