<?php

namespace App\Http\Requests;

use App\Models\Appointment;
use App\Models\User;
use App\Services\AppointmentSchedule;
use App\Services\ClientAcquisitionConfiguration;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @param  AppointmentSchedule  $schedule
     * @param  ClientAcquisitionConfiguration  $configuration
     * @return array<string, mixed>
     */
    public function rules(AppointmentSchedule $schedule, ClientAcquisitionConfiguration $configuration): array
    {
        $settings = $schedule->resolveSettings($configuration->forOwner($this->ownerId()));
        $serviceKeys = collect($settings['services'] ?? [])->pluck('key')->all();
        $meetingTypes = array_map(fn (array $type): string => $type['key'], $schedule->meetingTypes($settings));

        return [
            'company_name' => ['required', 'string', 'max:120'],
            'contact_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^[+]?[\\d\\s().-]{7,30}$/'],
            'service_key' => ['required', 'string', 'alpha_dash', 'max:40', Rule::in($serviceKeys)],
            'meeting_type' => ['required', 'string', Rule::in($meetingTypes)],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'market' => ['nullable', Rule::in(['ethiopia', 'international'])],
            'country' => ['nullable', 'string', 'max:80'],
            'website' => ['nullable', 'url', 'max:2048'],
            'marketing_consent' => ['sometimes', 'boolean'],
            'attribution' => ['nullable', 'array:utm_source,utm_medium,utm_campaign,referrer,landing_page,device'],
            'attribution.utm_source' => ['nullable', 'string', 'max:255'],
            'attribution.utm_medium' => ['nullable', 'string', 'max:255'],
            'attribution.utm_campaign' => ['nullable', 'string', 'max:255'],
            'attribution.referrer' => ['nullable', 'url', 'max:2000'],
            'attribution.landing_page' => ['nullable', 'string', 'max:2048'],
            'attribution.device' => ['nullable', Rule::in(['mobile', 'tablet', 'desktop'])],
        ];
    }

    /**
     * @param  AppointmentSchedule  $schedule
     * @param  ClientAcquisitionConfiguration  $configuration
     */
    public function withValidator(\Illuminate\Validation\Validator $validator, AppointmentSchedule $schedule, ClientAcquisitionConfiguration $configuration): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) use ($schedule, $configuration): void {
            $settings = $schedule->resolveSettings($configuration->forOwner($this->ownerId()));
            $country = $this->input('country');
            $market = $this->input('market');

            if ($market === 'ethiopia' && is_string($country) && filled($country) && mb_strtolower($country) !== 'ethiopia') {
                $validator->errors()->add('country', 'Choose Ethiopia for Ethiopian market requests.');
            }

            if (! $schedule->isEnabled($settings)) {
                $validator->errors()->add('date', 'Appointment booking is currently unavailable.');
            }

            $landingPage = data_get($this->input('attribution'), 'landing_page');
            if (is_string($landingPage) && (! str_starts_with($landingPage, '/') || str_starts_with($landingPage, '//') || str_contains($landingPage, '\\\\'))) {
                $validator->errors()->add('attribution.landing_page', 'The landing page must be a same-site path.');
            }

            if ($validator->errors()->any()) {
                return;
            }

            $start = $schedule->resolveStart($this->input('date'), $this->input('time'), $settings);
            $maxEnd = $start->copy()->addYear();
            if ($start->lessThan(now()->setTimezone($schedule->timezone($settings)))) {
                $validator->errors()->add('time', 'Choose a time in the future.');
            } elseif ($start->greaterThan($maxEnd)) {
                $validator->errors()->add('date', 'Choose a date within the next year.');
            } elseif (! $schedule->isWithinBusinessHours($start, $settings)) {
                $validator->errors()->add('time', 'Choose a time within the published business hours.');
            } elseif (! $schedule->canBook($start, (int) $this->ownerId(), $settings)) {
                $validator->errors()->add('time', 'That time is no longer available. Please choose another slot.');
            }
        });
    }

    private function ownerId(): ?int
    {
        return User::configuredLeadOwner()?->id;
    }

    public function meetingTypes(): array
    {
        return Appointment::MEETING_TYPES;
    }
}
