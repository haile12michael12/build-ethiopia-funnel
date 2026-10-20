<?php

namespace App\Services\Ai;

use App\Contracts\ContentDraftGenerator;
use RuntimeException;

class DisabledContentDraftGenerator implements ContentDraftGenerator
{
    public function generate(array $brief, array $brand, array $verifiedFacts): array
    {
        throw new RuntimeException('AI content generation is not configured. You can still create and edit drafts manually.');
    }
}
