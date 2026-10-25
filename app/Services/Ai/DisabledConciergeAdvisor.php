<?php

namespace App\Services\Ai;

use App\Contracts\ConciergeAdvisor;
use RuntimeException;

class DisabledConciergeAdvisor implements ConciergeAdvisor
{
    public function answer(array $context): array
    {
        throw new RuntimeException('The concierge AI advisor is not configured.');
    }
}
