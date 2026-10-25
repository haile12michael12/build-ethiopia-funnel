<?php

namespace App\Contracts;

interface ConciergeAdvisor
{
    /**
     * Answer a public visitor question using only the supplied business knowledge snapshot.
     *
     * @param  array{knowledge: array<string, mixed>, question: string, previous_questions: array<int, string>, locale: string}  $context
     * @return array{answer: string}
     */
    public function answer(array $context): array;
}
