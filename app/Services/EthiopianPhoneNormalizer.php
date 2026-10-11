<?php

namespace App\Services;

class EthiopianPhoneNormalizer
{
    public function normalize(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        if (! is_string($digits)) {
            return null;
        }

        if (str_starts_with($digits, '00251')) {
            $digits = substr($digits, 5);
        } elseif (str_starts_with($digits, '251')) {
            $digits = substr($digits, 3);
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return preg_match('/^[79]\d{8}$/', $digits) === 1 ? '+251'.$digits : null;
    }
}
