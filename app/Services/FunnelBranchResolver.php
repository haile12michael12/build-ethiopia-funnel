<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class FunnelBranchResolver
{
    public function __construct(private readonly FunnelRuleEngine $rules) {}

    /**
     * @param  array<string, mixed>  $branchesByStep
     * @return list<string>
     */
    public function validateConfiguration(array $branchesByStep): array
    {
        $errors = [];

        foreach ($branchesByStep as $stepSlug => $configuration) {
            if (! is_string($stepSlug) || ! $this->isSlug($stepSlug)) {
                $errors[] = 'Every branching step needs a valid slug.';

                continue;
            }

            if (! is_array($configuration)) {
                $errors[] = "Branch configuration for {$stepSlug} must be an object.";

                continue;
            }

            $default = $configuration['defaultNextStepSlug'] ?? null;
            if (! is_string($default) || ! $this->isSlug($default)) {
                $errors[] = "Branch configuration for {$stepSlug} needs a valid default next-step slug.";
            }

            $branches = $configuration['branches'] ?? [];
            if (! is_array($branches) || (! array_is_list($branches) && $branches !== [])) {
                $errors[] = "Branches for {$stepSlug} must be a list.";

                continue;
            }

            if (count($branches) > 50) {
                $errors[] = "Branch configuration for {$stepSlug} may contain at most 50 branches.";
            }

            foreach ($branches as $index => $branch) {
                $prefix = "Branch ".($index + 1)." for {$stepSlug}";
                if (! is_array($branch)) {
                    $errors[] = "{$prefix} must be an object.";

                    continue;
                }

                if (! is_string($branch['name'] ?? null) || trim($branch['name']) === '' || mb_strlen($branch['name']) > 100) {
                    $errors[] = "{$prefix} needs a name of 1 to 100 characters.";
                }

                if (! is_int($branch['priority'] ?? null) || $branch['priority'] < 0 || $branch['priority'] > 1000) {
                    $errors[] = "{$prefix} needs an integer priority from 0 to 1000.";
                }

                if (! is_string($branch['nextStepSlug'] ?? null) || ! $this->isSlug($branch['nextStepSlug'])) {
                    $errors[] = "{$prefix} needs a valid next-step slug.";
                }

                $ruleErrors = $this->rules->validate($branch['when'] ?? null);
                foreach ($ruleErrors as $error) {
                    $errors[] = "{$prefix}: {$error}";
                }
            }
        }

        return array_values(array_unique($errors));
    }

    /**
     * @param  array<string, mixed>  $branchesByStep
     * @return list<string>
     */
    public function validateDestinationSlugs(array $branchesByStep, User $owner): array
    {
        $slugs = [];
        foreach ($branchesByStep as $configuration) {
            if (! is_array($configuration)) {
                continue;
            }

            if (is_string($configuration['defaultNextStepSlug'] ?? null)) {
                $slugs[] = $configuration['defaultNextStepSlug'];
            }

            foreach ($configuration['branches'] ?? [] as $branch) {
                if (is_array($branch) && is_string($branch['nextStepSlug'] ?? null)) {
                    $slugs[] = $branch['nextStepSlug'];
                }
            }
        }

        $slugs = array_values(array_unique($slugs));
        $ownedSlugs = $owner->funnels()->whereIn('slug', $slugs)->pluck('slug')->all();

        return array_map(
            fn (string $slug): string => "The next-step funnel {$slug} is not owned by this account.",
            array_values(array_diff($slugs, $ownedSlugs)),
        );
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @param  array<string, mixed>  $context
     * @return array{matched_branch: string|null, next_step_slug: string}
     */
    public function resolve(array $configuration, array $context): array
    {
        $errors = $this->validateConfiguration(['current-step' => $configuration]);
        if ($errors !== []) {
            throw ValidationException::withMessages(['step_branches' => $errors]);
        }

        $branches = $configuration['branches'] ?? [];
        foreach ($this->inPriorityOrder($branches) as $branch) {
            if ($this->rules->matches($branch['when'], $context)) {
                return [
                    'matched_branch' => $branch['name'],
                    'next_step_slug' => $branch['nextStepSlug'],
                ];
            }
        }

        return [
            'matched_branch' => null,
            'next_step_slug' => $configuration['defaultNextStepSlug'],
        ];
    }

    private function isSlug(string $value): bool
    {
        return preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $value) === 1;
    }

    /**
     * @param  list<array<string, mixed>>  $branches
     * @return list<array<string, mixed>>
     */
    private function inPriorityOrder(array $branches): array
    {
        $indexed = [];
        foreach ($branches as $index => $branch) {
            $indexed[] = ['index' => $index, 'branch' => $branch];
        }

        usort($indexed, fn (array $left, array $right): int =>
            ($right['branch']['priority'] <=> $left['branch']['priority'])
            ?: ($left['index'] <=> $right['index'])
        );

        return array_column($indexed, 'branch');
    }
}
