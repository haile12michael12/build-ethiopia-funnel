<?php

namespace App\Services\Automation;

use Illuminate\Support\Str;

class WorkflowRecipes
{
    /**
     * @return array<string, array{name: string, description: string, definition: array}>
     */
    public function all(): array
    {
        return [
            'new-lead-welcome' => $this->newLeadWelcome(),
            'mern-starter-nurture' => $this->mernStarterNurture(),
            'mern-lead-score-routing' => $this->mernLeadScoreRouting(),
            'lead-to-opportunity' => $this->leadToOpportunity(),
            'qualified-follow-up' => $this->qualifiedFollowUp(),
            'high-value-alert' => $this->highValueAlert(),
            'won-thank-you' => $this->wonThankYou(),
        ];
    }

    public function blank(): array
    {
        $end = (string) Str::ulid();

        return [
            'schema_version' => 1,
            'trigger' => ['type' => 'funnel.form_submitted', 'config' => []],
            'start_node_id' => $end,
            'nodes' => [
                ['id' => $end, 'type' => 'end', 'config' => []],
            ],
        ];
    }

    public function get(?string $key): ?array
    {
        return $key ? ($this->all()[$key] ?? null) : null;
    }

    private function newLeadWelcome(): array
    {
        $email = (string) Str::ulid();
        $wait = (string) Str::ulid();
        $notify = (string) Str::ulid();
        $end = (string) Str::ulid();

        return [
            'name' => 'New lead welcome',
            'description' => 'Welcome a new funnel lead, wait one day, then remind the owner to follow up.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'funnel.form_submitted', 'config' => []],
                'start_node_id' => $email,
                'nodes' => [
                    ['id' => $email, 'type' => 'send_email', 'config' => [
                        'purpose' => 'marketing',
                        'subject' => 'Thanks for reaching out, {{ contact.name }}',
                        'body' => "We received your details and will be in touch soon.\n\n{{ unsubscribe_url }}",
                    ], 'next_node_id' => $wait],
                    ['id' => $wait, 'type' => 'wait', 'config' => ['amount' => 1, 'unit' => 'days'], 'next_node_id' => $notify],
                    ['id' => $notify, 'type' => 'notify_owner', 'config' => [
                        'subject' => 'Follow up with {{ contact.name }}',
                        'body' => '{{ contact.email }} submitted {{ funnel.name }} one day ago.',
                    ], 'next_node_id' => $end],
                    ['id' => $end, 'type' => 'end', 'config' => []],
                ],
            ],
        ];
    }

    private function leadToOpportunity(): array
    {
        $create = (string) Str::ulid();
        $end = (string) Str::ulid();

        return [
            'name' => 'Funnel lead to opportunity',
            'description' => 'Create a CRM opportunity whenever a funnel form is submitted.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'funnel.form_submitted', 'config' => []],
                'start_node_id' => $create,
                'nodes' => [
                    ['id' => $create, 'type' => 'create_opportunity', 'config' => [
                        'pipeline_id' => null,
                        'stage_id' => null,
                        'value' => 0,
                        'title' => '{{ contact.name }} — {{ funnel.name }}',
                    ], 'next_node_id' => $end],
                    ['id' => $end, 'type' => 'end', 'config' => []],
                ],
            ],
        ];
    }

    private function mernStarterNurture(): array
    {
        $subjects = [
            'Your MERN starter is ready',
            'The MERN folder structure I use in production',
            'The auth mistake that breaks most MERN apps',
            'From MERN starter to deployed SaaS',
            'Get the complete MERN SaaS Boilerplate',
            'Last chance: MERN starter bonus',
        ];
        $daysBetween = [1, 2, 2, 2, 2];
        $nodes = [];
        $emailIds = array_map(fn () => (string) Str::ulid(), $subjects);
        $waitIds = array_map(fn () => (string) Str::ulid(), $daysBetween);
        $end = (string) Str::ulid();

        foreach ($subjects as $index => $subject) {
            $nextNode = $index < count($subjects) - 1 ? $waitIds[$index] : $end;
            $body = $index === 0
                ? "Your MERN starter is ready. Add your hosted download URL here before publishing this workflow.\n\n{{ contact.name }}"
                : "A practical MERN implementation note for your next project.\n\n{{ unsubscribe_url }}";

            $nodes[] = [
                'id' => $emailIds[$index],
                'type' => 'send_email',
                'config' => [
                    'purpose' => $index === 0 ? 'transactional' : 'marketing',
                    'subject' => $subject,
                    'body' => $body,
                ],
                'next_node_id' => $nextNode,
            ];

            if ($index < count($daysBetween)) {
                $nodes[] = [
                    'id' => $waitIds[$index],
                    'type' => 'wait',
                    'config' => ['amount' => $daysBetween[$index], 'unit' => 'days'],
                    'next_node_id' => $emailIds[$index + 1],
                ];
            }
        }

        $nodes[] = ['id' => $end, 'type' => 'end', 'config' => []];

        return [
            'name' => 'MERN Starter Welcome + Nurture',
            'description' => 'Deliver the MERN starter, then send the six-message developer nurture sequence over nine days.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'funnel.form_submitted', 'config' => []],
                'start_node_id' => $emailIds[0],
                'nodes' => $nodes,
            ],
        ];
    }

    private function mernLeadScoreRouting(): array
    {
        $educational = (string) Str::ulid();
        $educationalEmail = (string) Str::ulid();
        $educationalEnd = (string) Str::ulid();
        $offers = (string) Str::ulid();
        $offerEmail = (string) Str::ulid();
        $offerEnd = (string) Str::ulid();
        $consultingEmail = (string) Str::ulid();
        $consultingEnd = (string) Str::ulid();

        return [
            'name' => 'MERN Lead Score Routing',
            'description' => 'Route educational, boilerplate/course, or code-review follow-up when a contact moves into a lead-score band.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'contact.lead_score_updated', 'config' => []],
                'start_node_id' => $educational,
                'nodes' => [
                    [
                        'id' => $educational,
                        'type' => 'condition',
                        'config' => ['field' => 'event.payload.score_band', 'operator' => 'equals', 'value' => 'educational'],
                        'yes_node_id' => $educationalEmail,
                        'no_node_id' => $offers,
                    ],
                    [
                        'id' => $educationalEmail,
                        'type' => 'send_email',
                        'config' => [
                            'purpose' => 'marketing',
                            'subject' => 'Your next MERN learning steps',
                            'body' => "Start with the fundamentals and ship a small feature this week.\n\n{{ unsubscribe_url }}",
                        ],
                        'next_node_id' => $educationalEnd,
                    ],
                    ['id' => $educationalEnd, 'type' => 'end', 'config' => []],
                    [
                        'id' => $offers,
                        'type' => 'condition',
                        'config' => ['field' => 'event.payload.score_band', 'operator' => 'equals', 'value' => 'offers'],
                        'yes_node_id' => $offerEmail,
                        'no_node_id' => $consultingEmail,
                    ],
                    [
                        'id' => $offerEmail,
                        'type' => 'send_email',
                        'config' => [
                            'purpose' => 'marketing',
                            'subject' => 'Build faster with the MERN SaaS Boilerplate',
                            'body' => "Compare the boilerplate and course options for your next project.\n\n{{ unsubscribe_url }}",
                        ],
                        'next_node_id' => $offerEnd,
                    ],
                    ['id' => $offerEnd, 'type' => 'end', 'config' => []],
                    [
                        'id' => $consultingEmail,
                        'type' => 'send_email',
                        'config' => [
                            'purpose' => 'marketing',
                            'subject' => 'Want a senior developer review?',
                            'body' => "Book a focused code review or consulting session for your launch.\n\n{{ unsubscribe_url }}",
                        ],
                        'next_node_id' => $consultingEnd,
                    ],
                    ['id' => $consultingEnd, 'type' => 'end', 'config' => []],
                ],
            ],
        ];
    }

    private function qualifiedFollowUp(): array
    {
        $email = (string) Str::ulid();
        $end = (string) Str::ulid();

        return [
            'name' => 'Qualified contact follow-up',
            'description' => 'Send a personal next-step email when a contact becomes qualified.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'contact.status_changed', 'config' => ['to_status' => 'qualified']],
                'start_node_id' => $email,
                'nodes' => [
                    ['id' => $email, 'type' => 'send_email', 'config' => [
                        'purpose' => 'transactional',
                        'subject' => 'Your next steps',
                        'body' => 'Hi {{ contact.name }}, we are ready to discuss the next step.',
                    ], 'next_node_id' => $end],
                    ['id' => $end, 'type' => 'end', 'config' => []],
                ],
            ],
        ];
    }

    private function highValueAlert(): array
    {
        $condition = (string) Str::ulid();
        $notify = (string) Str::ulid();
        $yesEnd = (string) Str::ulid();
        $noEnd = (string) Str::ulid();

        return [
            'name' => 'High-value opportunity alert',
            'description' => 'Notify the owner when a new opportunity reaches the configured value.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'opportunity.created', 'config' => []],
                'start_node_id' => $condition,
                'nodes' => [
                    ['id' => $condition, 'type' => 'condition', 'config' => [
                        'field' => 'opportunity.value',
                        'operator' => 'greater_than_or_equal',
                        'value' => 5000,
                    ], 'yes_node_id' => $notify, 'no_node_id' => $noEnd],
                    ['id' => $notify, 'type' => 'notify_owner', 'config' => [
                        'subject' => 'High-value opportunity: {{ opportunity.title }}',
                        'body' => '{{ contact.name }} now has an opportunity worth {{ opportunity.value }}.',
                    ], 'next_node_id' => $yesEnd],
                    ['id' => $yesEnd, 'type' => 'end', 'config' => []],
                    ['id' => $noEnd, 'type' => 'end', 'config' => []],
                ],
            ],
        ];
    }

    private function wonThankYou(): array
    {
        $email = (string) Str::ulid();
        $end = (string) Str::ulid();

        return [
            'name' => 'Won opportunity thank-you',
            'description' => 'Send a transactional thank-you when an opportunity is won.',
            'definition' => [
                'schema_version' => 1,
                'trigger' => ['type' => 'opportunity.status_changed', 'config' => ['to_status' => 'won']],
                'start_node_id' => $email,
                'nodes' => [
                    ['id' => $email, 'type' => 'send_email', 'config' => [
                        'purpose' => 'transactional',
                        'subject' => 'Thank you, {{ contact.name }}',
                        'body' => 'We are excited to get started with you.',
                    ], 'next_node_id' => $end],
                    ['id' => $end, 'type' => 'end', 'config' => []],
                ],
            ],
        ];
    }
}
