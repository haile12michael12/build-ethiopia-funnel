<?php

namespace App\Actions\Leads;

use App\Models\Contact;

class QualifyLead
{
    public function handle(Contact $contact, ?int $threshold = null): Contact
    {
        if ($contact->status === 'new' && $contact->lead_score >= ($threshold ?? (int) config('business-audit.qualified_score', 70))) {
            $contact->forceFill(['status' => 'qualified'])->save();
        }

        return $contact;
    }
}
