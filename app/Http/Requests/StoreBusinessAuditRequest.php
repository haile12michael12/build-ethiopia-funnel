<?php

namespace App\Http\Requests;

use App\Services\EthiopianPhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreBusinessAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('phone')) {
            $this->merge([
                'phone' => app(EthiopianPhoneNormalizer::class)->normalize($this->input('phone')) ?? $this->input('phone'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'business_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^\+251[79]\d{8}$/'],
            'website' => ['nullable', 'url', 'max:2048'],
            'website_status' => ['required', 'in:live,needs_improvement,no_website'],
            'service_interests' => ['required', 'array', 'min:1', 'max:5'],
            'service_interests.*' => ['required', 'string', 'distinct', 'in:website,marketing,branding,automation,ecommerce'],
            'budget' => ['required', 'in:under_25000,25000_100000,100000_500000,over_500000'],
            'timeline' => ['required', 'in:within_1_month,1_to_3_months,3_to_6_months,researching'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (filled($this->input('phone')) && app(EthiopianPhoneNormalizer::class)->normalize($this->input('phone')) === null) {
                $validator->errors()->add('phone', __('business-audit.validation.phone'));
            }
        });
    }
}
