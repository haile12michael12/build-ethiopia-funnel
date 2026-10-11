<?php

namespace App\Http\Resources;

use App\Models\Contact;
use App\Services\AuditReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Contact */
class BusinessAuditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $audit = $this->business_audit ?? [];

        return [
            'business_name' => $audit['business_name'] ?? '',
            'score' => $this->lead_score,
            'report' => app(AuditReportService::class)->create(
                $audit,
                (int) $this->lead_score,
                $this->lead_score_breakdown ?? [],
            ),
        ];
    }
}
