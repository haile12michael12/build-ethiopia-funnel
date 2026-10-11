<?php

namespace App\Actions\Leads;

use App\Models\Contact;
use App\Services\LeadScoringService;

class UpdateLeadScore
{
    /**
     * @param  array<string, mixed>  $audit
     */
    public function handle(Contact $contact, array $audit, LeadScoringService $scoring): Contact
    {
        $result = $scoring->score($audit);

        $contact->forceFill([
            'lead_score' => $result['score'],
            'lead_score_breakdown' => $result['breakdown'],
        ])->save();

        return $contact;
    }
}
