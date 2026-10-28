<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Services\ClientAcquisitionConfiguration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreClientProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(ClientAcquisitionConfiguration $configuration): array
    {
        $settings = $configuration->forOwner($this->ownerId());

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^[+]?[\d\s().-]{7,30}$/'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'market' => ['required', Rule::in(['ethiopia', 'international'])],
            'country' => ['required', 'string', 'max:120'],
            'service_interests' => ['required', 'array', 'min:1', 'max:5'],
            'service_interests.*' => ['required', 'string', 'distinct', Rule::in(collect($settings['services'])->pluck('key')->all())],
            'project_description' => ['required', 'string', 'min:30', 'max:5000'],
            'budget' => ['required', Rule::in(collect($settings['budgets'])->pluck('key')->all())],
            'timeline' => ['required', Rule::in(collect($settings['timelines'])->pluck('key')->all())],
            'website' => ['nullable', 'url', 'max:2048'],
            'social_links' => ['nullable', 'array', 'max:4'],
            'social_links.*' => ['nullable', 'url', 'max:2048'],
            'preferred_contact' => ['required', Rule::in(['email', 'phone', 'whatsapp'])],
            'additional_requirements' => ['nullable', 'string', 'max:3000'],
            'marketing_consent' => ['sometimes', 'boolean'],
            'attribution' => ['nullable', 'array:utm_source,utm_medium,utm_campaign,utm_term,utm_content,referrer,landing_page,device'],
            'attribution.utm_source' => ['nullable', 'string', 'max:255'],
            'attribution.utm_medium' => ['nullable', 'string', 'max:255'],
            'attribution.utm_campaign' => ['nullable', 'string', 'max:255'],
            'attribution.utm_term' => ['nullable', 'string', 'max:255'],
            'attribution.utm_content' => ['nullable', 'string', 'max:255'],
            'attribution.referrer' => ['nullable', 'url', 'max:2000'],
            'attribution.landing_page' => ['nullable', 'string', 'max:2048'],
            'attribution.device' => ['nullable', Rule::in(['mobile', 'tablet', 'desktop'])],
            'session_id' => ['nullable', 'uuid'],
            'variant_id' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $country = $this->input('country');
            if ($this->input('market') === 'ethiopia' && is_string($country) && filled($country) && mb_strtolower($country) !== 'ethiopia') {
                $validator->errors()->add('country', __('client-acquisition.validation.country_market'));
            }

            $settings = app(ClientAcquisitionConfiguration::class)->forOwner($this->ownerId());
            $budget = collect($settings['budgets'])->firstWhere('key', $this->input('budget'));
            $expectedCurrency = $this->input('market') === 'ethiopia' ? 'ETB' : 'USD';

            if ($budget && $budget['currency'] !== $expectedCurrency) {
                $validator->errors()->add('budget', 'Choose a planning range in the selected market currency.');
            }

            $landingPage = data_get($this->input('attribution'), 'landing_page');
            if (is_string($landingPage) && (! str_starts_with($landingPage, '/') || str_starts_with($landingPage, '//') || str_contains($landingPage, '\\'))) {
                $validator->errors()->add('attribution.landing_page', 'The landing page must be a same-site path.');
            }
        });
    }

    private function ownerId(): ?int
    {
        return User::configuredLeadOwner()?->id;
    }
}
