<?php

namespace App\Http\Requests;

use App\Services\EthiopianPhoneNormalizer;
use DateTimeZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('phone')) {
            $phone = trim((string) $this->input('phone'));
            $this->merge([
                'phone' => app(EthiopianPhoneNormalizer::class)->normalize($phone) ?? $phone,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
            'timezone' => ['nullable', 'string', 'max:64', Rule::in(DateTimeZone::listIdentifiers())],
        ];
    }
}
