<?php

namespace App\Http\Requests;

use App\Services\EthiopianPhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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

        if (! in_array($this->input('market'), ['ethiopia', 'international'], true)) {
            $this->merge(['market' => 'ethiopia']);
        }
    }

    public function rules(): array
    {
        $etbBudgets = collect(config('business-audit.options.budgets'))->pluck('value')->all();
        $usdBudgets = collect(config('business-audit.options.international_budgets'))->pluck('value')->all();

        return [
            'name' => ['required', 'string', 'max:255'],
            'business_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^\+251[79]\d{8}$/'],
            'website' => ['nullable', 'url', 'max:2048'],
            'website_status' => ['required', Rule::in(collect(config('business-audit.options.website_statuses'))->pluck('value')->all())],
            'market' => ['required', Rule::in(['ethiopia', 'international'])],
            'country' => ['nullable', 'string', 'max:120'],
            'service_interests' => ['required', 'array', 'min:1', 'max:5'],
            'service_interests.*' => ['required', 'string', 'distinct', Rule::in(collect(config('business-audit.options.services'))->pluck('value')->all())],
            'budget' => ['required', Rule::in([...$etbBudgets, ...$usdBudgets])],
            'timeline' => ['required', Rule::in(collect(config('business-audit.options.timelines'))->pluck('value')->all())],
            'session_id' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (filled($this->input('phone')) && app(EthiopianPhoneNormalizer::class)->normalize($this->input('phone')) === null) {
                $validator->errors()->add('phone', __('business-audit.validation.phone'));
            }

            $budget = (string) $this->input('budget');
            $expectedCurrency = $this->input('market') === 'international' ? 'USD' : 'ETB';
            $validForMarket = collect($expectedCurrency === 'USD'
                ? config('business-audit.options.international_budgets')
                : config('business-audit.options.budgets'))
                ->pluck('value')
                ->contains($budget);

            if ($budget !== '' && ! $validForMarket) {
                $validator->errors()->add('budget', "The budget range must use {$expectedCurrency} for the selected market.");
            }
        });
    }
}
