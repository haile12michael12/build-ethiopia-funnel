<?php

namespace App\Actions\Leads;

use App\Models\Contact;

class QualifyLead
{
    public function handle(Contact $contact): Contact
    {
        if ($contact->status === 'new' && $contact->lead_score >= (int) config('business-audit.qualified_score', 70)) {
            $contact->forceFill(['status' => 'qualified'])->save();
        }

        return $contact;
    }
}
