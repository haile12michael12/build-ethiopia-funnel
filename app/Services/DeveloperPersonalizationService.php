<?php

namespace App\Services;

use App\Models\DeveloperProfile;

class DeveloperPersonalizationService
{
    /**
     * @return array{offer_slug:string,offer_name:string,reason:string,recommended_modules:list<string>}
     */
    public function recommend(DeveloperProfile $profile): array
    {
        $goal = data_get($profile->contact?->metadata, 'developer_quiz_answers.goal');
        $experience = data_get($profile->contact?->metadata, 'developer_quiz_answers.experience')
            ?? $profile->experience_level;

        if ($experience === 'beginner' || in_array($goal, ['get-developer-job', 'learn-full-stack'], true)) {
            return [
                'offer_slug' => 'mern-course',
                'offer_name' => 'MERN Course',
                'reason' => 'Your learning goals suggest a guided path through MERN fundamentals.',
                'recommended_modules' => ['guided-learning', 'testing', 'deployment'],
            ];
        }

        if ($profile->has_saas_repo && in_array($profile->primary_language, ['TypeScript', 'JavaScript'], true)) {
            return [
                'offer_slug' => 'mern-boilerplate',
                'offer_name' => 'MERN SaaS Boilerplate',
                'reason' => 'Your public repositories suggest you are already building SaaS products.',
                'recommended_modules' => ['authentication', 'billing', 'admin-dashboard', 'deployment'],
            ];
        }

        if ($goal === 'client-projects') {
            return [
                'offer_slug' => 'mern-boilerplate',
                'offer_name' => 'MERN Boilerplate',
                'reason' => 'A reusable project foundation can help you deliver client work faster.',
                'recommended_modules' => ['authentication', 'api', 'testing'],
            ];
        }

        return [
            'offer_slug' => 'mern-boilerplate',
            'offer_name' => 'MERN Boilerplate',
            'reason' => 'A reusable MERN foundation is a practical next step for your current stack.',
            'recommended_modules' => ['authentication', 'api', 'deployment'],
        ];
    }
}
