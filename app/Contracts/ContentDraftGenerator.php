<?php

namespace App\Contracts;

interface ContentDraftGenerator
{
    /**
     * @param  array<string, mixed>  $brief
     * @param  array<string, mixed>  $brand
     * @param  array<string, mixed>  $verifiedFacts
     * @return array{title: string, body: string}
     */
    public function generate(array $brief, array $brand, array $verifiedFacts): array;
}
