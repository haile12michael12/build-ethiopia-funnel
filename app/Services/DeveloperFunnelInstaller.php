<?php

namespace App\Services;

use App\Models\Funnel;
use App\Models\User;
use App\Services\Automation\WorkflowRecipes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DeveloperFunnelInstaller
{
    private const PAGE_SLUGS = [
        'mern-saas-starter',
        'mern-starter-delivery',
        'developer-quiz',
        'mern-boilerplate',
        'mern-course',
        'code-review',
        'thank-you',
    ];

    public function installFor(User $owner): Funnel
    {
        $conflict = Funnel::query()
            ->whereIn('slug', self::PAGE_SLUGS)
            ->where('user_id', '!=', $owner->id)
            ->first();

        if ($conflict) {
            throw ValidationException::withMessages([
                'funnel' => "The slug {$conflict->slug} is already in use. Rename the conflicting funnel before installing this starter.",
            ]);
        }

        return DB::transaction(function () use ($owner): Funnel {
            $pages = [];
            foreach ($this->pages() as $slug => $page) {
                $pages[$slug] = Funnel::query()->firstOrCreate(
                    ['slug' => $slug],
                    [
                        'user_id' => $owner->id,
                        'name' => $page['name'],
                        'description' => $page['description'],
                        'content' => $page['content'],
                        'settings' => $page['settings'],
                        'step_branches' => $page['step_branches'] ?? null,
                        'status' => 'published',
                        'is_published' => true,
                        'published_at' => now(),
                    ],
                );
            }

            $quiz = $pages['developer-quiz'];
            if ($quiz->step_branches === null) {
                $quiz->update(['step_branches' => $this->quizBranches()]);
            }

            $this->createHeadlineVariant($pages['mern-saas-starter']);
            $this->createNurtureDraft($owner, $pages['mern-saas-starter']);
            $this->createLeadScoreRoutingDraft($owner);

            return $pages['mern-saas-starter'];
        });
    }

    /**
     * @return array<string, array{name:string,description:string,content:array,settings:array,step_branches?:array}>
     */
    private function pages(): array
    {
        $deliveryUrl = route('funnels.show', 'mern-starter-delivery');
        $quizUrl = route('funnels.show', 'developer-quiz');
        $offerPages = [
            'mern-boilerplate' => ['MERN SaaS Boilerplate', '$97', 'Get the MERN SaaS Boilerplate'],
            'mern-course' => ['MERN Course', '$149', 'Start the MERN Course'],
            'code-review' => ['Code Review', '$249', 'Book Your Code Review'],
        ];

        $pages = [
            'mern-saas-starter' => [
                'name' => 'MERN SaaS Starter Funnel',
                'description' => 'Free MERN starter lead magnet for software developers.',
                'content' => $this->content([
                    $this->textBlock('landing-headline', 'Ship your next MERN app in days—not weeks.', '40px', 'bold'),
                    $this->textBlock('landing-subheadline', 'Get a production-ready MERN starter with authentication, API structure, validation, and deployment checklist.', '20px'),
                    $this->formBlock('starter-opt-in', 'Get the Free MERN Starter', [
                        ['id' => 'first_name', 'name' => 'first_name', 'type' => 'text', 'label' => 'First name', 'placeholder' => 'Your first name', 'required' => true],
                        ['id' => 'email', 'name' => 'email', 'type' => 'email', 'label' => 'Email', 'placeholder' => 'you@example.com', 'required' => true],
                        ['id' => 'goal', 'name' => 'goal', 'type' => 'select', 'label' => 'What is your goal?', 'options' => ['launch-saas', 'client-projects', 'get-developer-job', 'learn-full-stack'], 'required' => true],
                        ['id' => 'marketing_consent', 'name' => 'marketing_consent', 'type' => 'checkbox', 'label' => 'Send me developer tips and product updates', 'required' => false],
                    ], [
                        'successAction' => 'redirect',
                        'successUrl' => $deliveryUrl,
                    ]),
                ]),
            ],
            'mern-starter-delivery' => [
                'name' => 'MERN Starter Delivery',
                'description' => 'Delivery and next-step page for the free MERN starter.',
                'content' => $this->content([
                    $this->textBlock('delivery-headline', 'Your MERN starter is ready.', '36px', 'bold'),
                    $this->textBlock('delivery-body', 'Check your email for the download link and setup guide.', '18px'),
                    $this->buttonBlock('delivery-quiz-cta', 'Take the 60-second developer quiz', $quizUrl),
                ]),
            ],
            'developer-quiz' => [
                'name' => 'Developer Qualification Quiz',
                'description' => 'Three questions to personalize the developer offer.',
                'content' => $this->content([
                    $this->textBlock('quiz-headline', 'Find your best next step.', '34px', 'bold'),
                    $this->formBlock('developer-quiz-form', 'Get my personalized recommendation', [
                        ['id' => 'experience', 'name' => 'experience', 'type' => 'select', 'label' => 'How experienced are you with MERN?', 'options' => ['beginner', 'intermediate', 'advanced'], 'required' => true],
                        ['id' => 'goal', 'name' => 'goal', 'type' => 'select', 'label' => 'What do you want to build next?', 'options' => ['launch-saas', 'client-projects', 'get-developer-job', 'learn-full-stack'], 'required' => true],
                        ['id' => 'timeline', 'name' => 'timeline', 'type' => 'select', 'label' => 'When do you want to launch?', 'options' => ['immediately', 'soon', 'exploring'], 'required' => true],
                    ], ['branchStepSlug' => 'developer-quiz']),
                ]),
                'step_branches' => $this->quizBranches(),
            ],
        ];

        foreach ($offerPages as $slug => [$name, $price, $cta]) {
            $pages[$slug] = [
                'name' => $name,
                'description' => "Personalized software developer offer: {$name}.",
                'content' => $this->content([
                    $this->textBlock("{$slug}-headline", $name, '36px', 'bold'),
                    $this->textBlock("{$slug}-price", $price, '28px', 'semibold'),
                    $this->buttonBlock("{$slug}-cta", $cta, route('funnels.show', 'thank-you')),
                ]),
            ];
        }

        $pages['thank-you'] = [
            'name' => 'MERN Starter Thank You',
            'description' => 'Confirmation page for the developer funnel.',
            'content' => $this->content([
                $this->textBlock('thank-you-headline', 'Thanks for taking the next step.', '36px', 'bold'),
                $this->textBlock('thank-you-body', 'Check your email for the details and next steps.', '18px'),
            ]),
        ];

        return array_map(fn (array $page): array => [
            ...$page,
            'settings' => ['backgroundColor' => '#ffffff', 'maxWidth' => '960px', 'fontFamily' => 'Inter, sans-serif'],
        ], $pages);
    }

    private function quizBranches(): array
    {
        return [
            'developer-quiz' => [
                'defaultNextStepSlug' => 'mern-boilerplate',
                'branches' => [
                    [
                        'name' => 'Beginner learning path',
                        'priority' => 70,
                        'when' => ['field' => 'answers.experience', 'operator' => 'eq', 'value' => 'beginner'],
                        'nextStepSlug' => 'mern-course',
                    ],
                    [
                        'name' => 'Ready to launch SaaS',
                        'priority' => 100,
                        'when' => ['all' => [
                            ['field' => 'answers.goal', 'operator' => 'eq', 'value' => 'launch-saas'],
                            ['field' => 'answers.timeline', 'operator' => 'eq', 'value' => 'immediately'],
                        ]],
                        'nextStepSlug' => 'code-review',
                    ],
                    [
                        'name' => 'TypeScript SaaS builder',
                        'priority' => 95,
                        'when' => ['all' => [
                            ['field' => 'github.primary_language', 'operator' => 'eq', 'value' => 'TypeScript'],
                            ['field' => 'github.has_saas_repo', 'operator' => 'eq', 'value' => true],
                        ]],
                        'nextStepSlug' => 'mern-boilerplate',
                    ],
                    [
                        'name' => 'Client project builder',
                        'priority' => 90,
                        'when' => ['field' => 'answers.goal', 'operator' => 'eq', 'value' => 'client-projects'],
                        'nextStepSlug' => 'mern-boilerplate',
                    ],
                ],
            ],
        ];
    }

    private function createHeadlineVariant(Funnel $landing): void
    {
        if ($landing->variants()->exists()) {
            return;
        }

        $content = $landing->content;
        foreach ($content['sections'] ?? [] as $sectionIndex => $section) {
            foreach ($section['columns'] ?? [] as $columnIndex => $column) {
                foreach ($column['blocks'] ?? [] as $blockIndex => $block) {
                    if (($block['type'] ?? null) === 'text' && data_get($block, 'content.text') === 'Ship your next MERN app in days—not weeks.') {
                        $content['sections'][$sectionIndex]['columns'][$columnIndex]['blocks'][$blockIndex]['content']['text']
                            = 'Stop rebuilding auth, APIs, and deployment setup.';
                    }
                    if (($block['type'] ?? null) === 'form' && is_array($block['content']['fields'] ?? null)) {
                        $content['sections'][$sectionIndex]['columns'][$columnIndex]['blocks'][$blockIndex]['content']['buttonText']
                            = 'Download the MERN Starter';
                    }
                }
            }
        }

        $landing->variants()->create([
            'name' => 'Variant B — setup-focused headline',
            'content' => $content,
            'settings' => [
                ...($landing->settings ?? []),
                'conversion_goal' => 'form_submit',
            ],
            'weight' => 50,
            'is_active' => true,
        ]);
    }

    private function createNurtureDraft(User $owner, Funnel $landing): void
    {
        if ($owner->automationWorkflows()->where('name', 'MERN Starter Welcome + Nurture')->exists()) {
            return;
        }

        $recipe = app(WorkflowRecipes::class)->get('mern-starter-nurture');
        $definition = $recipe['definition'];
        $definition['trigger']['config']['funnel_id'] = $landing->id;

        $owner->automationWorkflows()->create([
            'name' => 'MERN Starter Welcome + Nurture',
            'description' => 'Review the delivery URL and consent settings, then publish the six-email sequence.',
            'status' => 'draft',
            'enrollment_policy' => 'every_event',
            'trigger_type' => 'funnel.form_submitted',
            'draft_definition' => $definition,
            'revision' => 1,
        ]);
    }

    private function createLeadScoreRoutingDraft(User $owner): void
    {
        if ($owner->automationWorkflows()->where('name', 'MERN Lead Score Routing')->exists()) {
            return;
        }

        $recipe = app(WorkflowRecipes::class)->get('mern-lead-score-routing');
        $definition = $recipe['definition'];

        $owner->automationWorkflows()->create([
            'name' => 'MERN Lead Score Routing',
            'description' => $recipe['description'],
            'status' => 'draft',
            'enrollment_policy' => 'every_event',
            'trigger_type' => 'contact.lead_score_updated',
            'draft_definition' => $definition,
            'revision' => 1,
        ]);
    }

    private function content(array $blocks): array
    {
        return [
            'sections' => [[
                'id' => (string) Str::ulid(),
                'type' => 'section',
                'layout' => 'single',
                'columns' => [[
                    'id' => (string) Str::ulid(),
                    'type' => 'column',
                    'width' => 100,
                    'blocks' => $blocks,
                    'settings' => ['padding' => '24px', 'backgroundColor' => 'transparent', 'verticalAlign' => 'top'],
                ]],
                'settings' => [
                    'backgroundColor' => '#ffffff',
                    'padding' => '48px 24px',
                    'margin' => '0',
                    'minHeight' => '100vh',
                    'fullWidth' => false,
                ],
            ]],
        ];
    }

    private function textBlock(string $id, string $text, string $fontSize, string $fontWeight = 'normal'): array
    {
        return [
            'id' => $id,
            'type' => 'text',
            'content' => ['text' => $text, 'fontSize' => $fontSize, 'fontWeight' => $fontWeight, 'textAlign' => 'center', 'color' => '#111827'],
            'settings' => $this->blockSettings(),
        ];
    }

    private function buttonBlock(string $id, string $text, string $url): array
    {
        return [
            'id' => $id,
            'type' => 'button',
            'content' => ['text' => $text, 'url' => $url, 'variant' => 'primary', 'size' => 'large', 'fullWidth' => false, 'newTab' => false],
            'settings' => $this->blockSettings(),
        ];
    }

    private function formBlock(string $id, string $title, array $fields, array $extra = []): array
    {
        return [
            'id' => $id,
            'type' => 'form',
            'content' => [
                'title' => $title,
                'fields' => $fields,
                'buttonText' => $title,
                'successMessage' => 'Thanks. Your information was submitted.',
                ...$extra,
            ],
            'settings' => $this->blockSettings(),
        ];
    }

    private function blockSettings(): array
    {
        return [
            'padding' => '16px',
            'margin' => '0',
            'backgroundColor' => 'transparent',
            'borderRadius' => '0',
        ];
    }
}
