<?php

namespace App\Services;

use Illuminate\Support\Arr;
class FunnelRuleEngine
{
    private const OPERATORS = [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn',
        'contains', 'startsWith', 'endsWith', 'exists', 'empty',
    ];

    /**
     * @return list<string>
     */
    public function validate(mixed $rule, int $depth = 0): array
    {
        if (! is_array($rule) || $rule === []) {
            return ['A rule must be a non-empty object.'];
        }

        if ($depth > 10) {
            return ['Rules may be nested no more than 10 levels.'];
        }

        $errors = [];
        $hasCondition = false;
        $unexpectedKeys = array_diff(array_keys($rule), ['field', 'operator', 'value', 'all', 'any', 'not']);
        if ($unexpectedKeys !== []) {
            $errors[] = 'Rules contain unsupported keys: '.implode(', ', $unexpectedKeys).'.';
        }

        foreach (['all', 'any'] as $group) {
            if (! array_key_exists($group, $rule)) {
                continue;
            }

            $hasCondition = true;
            if (! is_array($rule[$group]) || (! array_is_list($rule[$group]) && $rule[$group] !== [])) {
                $errors[] = "The {$group} condition must be a list.";

                continue;
            }

            if (count($rule[$group]) > 50) {
                $errors[] = "A {$group} condition may contain at most 50 rules.";
            }
            if ($group === 'all' && $rule[$group] === []) {
                $errors[] = 'An all condition must contain at least one rule.';
            }

            foreach ($rule[$group] as $child) {
                $errors = [...$errors, ...$this->validate($child, $depth + 1)];
            }
        }

        if (array_key_exists('not', $rule)) {
            $hasCondition = true;
            $errors = [...$errors, ...$this->validate($rule['not'], $depth + 1)];
        }

        if (array_key_exists('field', $rule) || array_key_exists('operator', $rule)) {
            $hasCondition = true;
            $field = $rule['field'] ?? null;
            $operator = $rule['operator'] ?? null;

            if (! is_string($field) || ! preg_match('/^[A-Za-z][A-Za-z0-9_.]*$/', $field)) {
                $errors[] = 'A rule field must be a valid dotted field path.';
            }

            if (! is_string($operator) || ! in_array($operator, self::OPERATORS, true)) {
                $errors[] = 'A rule must use a supported operator.';
            } elseif (! in_array($operator, ['exists', 'empty'], true) && ! array_key_exists('value', $rule)) {
                $errors[] = "The {$operator} operator requires a value.";
            } elseif (in_array($operator, ['gt', 'gte', 'lt', 'lte'], true)
                && (! is_numeric($rule['value'] ?? null))) {
                $errors[] = "The {$operator} operator requires a numeric value.";
            } elseif (in_array($operator, ['in', 'notIn'], true) && ! is_array($rule['value'] ?? null)) {
                $errors[] = "The {$operator} operator requires a list of values.";
            } elseif (in_array($operator, ['in', 'notIn'], true)
                && array_filter($rule['value'], fn (mixed $value): bool => ! is_scalar($value) && $value !== null) !== []) {
                $errors[] = "The {$operator} operator accepts only scalar list values.";
            } elseif (in_array($operator, ['startsWith', 'endsWith'], true)
                && (! is_string($rule['value'] ?? null) || $rule['value'] === '')) {
                $errors[] = "The {$operator} operator requires a non-empty text value.";
            } elseif (in_array($operator, ['eq', 'neq', 'contains', 'startsWith', 'endsWith'], true)
                && ! is_scalar($rule['value'] ?? null) && ($rule['value'] ?? null) !== null) {
                $errors[] = "The {$operator} operator requires a scalar value.";
            }
        }

        if (! $hasCondition) {
            $errors[] = 'A rule must include a field condition or a nested group.';
        }

        return array_values(array_unique($errors));
    }

    /**
     * @param  array<string, mixed>  $rule
     * @param  array<string, mixed>  $context
     */
    public function matches(array $rule, array $context): bool
    {
        $errors = $this->validate($rule);
        if ($errors !== []) {
            throw new \InvalidArgumentException(implode(' ', $errors));
        }

        if (isset($rule['all'])) {
            foreach ($rule['all'] as $child) {
                if (! $this->matches($child, $context)) {
                    return false;
                }
            }
        }

        if (isset($rule['any']) && $rule['any'] !== []) {
            $anyMatches = false;
            foreach ($rule['any'] as $child) {
                if ($this->matches($child, $context)) {
                    $anyMatches = true;
                    break;
                }
            }
            if (! $anyMatches) {
                return false;
            }
        }

        if (array_key_exists('not', $rule) && $this->matches($rule['not'], $context)) {
            return false;
        }

        if (! array_key_exists('field', $rule)) {
            return true;
        }

        $field = $rule['field'];
        $operator = $rule['operator'];
        $exists = Arr::has($context, $field);
        $actual = data_get($context, $field);
        $expected = $rule['value'] ?? null;

        return match ($operator) {
            'eq' => $actual === $expected,
            'neq' => $actual !== $expected,
            'gt' => is_numeric($actual) && (float) $actual > (float) $expected,
            'gte' => is_numeric($actual) && (float) $actual >= (float) $expected,
            'lt' => is_numeric($actual) && (float) $actual < (float) $expected,
            'lte' => is_numeric($actual) && (float) $actual <= (float) $expected,
            'in' => in_array($actual, $expected, true),
            'notIn' => ! in_array($actual, $expected, true),
            'contains' => is_array($actual)
                ? in_array($expected, $actual, true)
                : (is_string($actual) && is_string($expected) && str_contains($actual, $expected)),
            'startsWith' => is_string($actual) && is_string($expected) && str_starts_with($actual, $expected),
            'endsWith' => is_string($actual) && is_string($expected) && str_ends_with($actual, $expected),
            'exists' => $exists,
            'empty' => ! $exists || blank($actual),
        };
    }
}
