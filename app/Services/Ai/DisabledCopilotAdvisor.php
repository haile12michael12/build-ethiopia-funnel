<?php

namespace App\Services\Ai;

use App\Contracts\CopilotAdvisor;
use RuntimeException;

class DisabledCopilotAdvisor implements CopilotAdvisor
{
    public function advise(array $context): array
    {
        throw new RuntimeException('AI copilot advisor is not configured.');
    }

    public function answerSupportQuestion(array $context): array
    {
        throw new RuntimeException('AI support chat is not configured.');
    }
}
