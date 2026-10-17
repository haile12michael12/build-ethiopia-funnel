import { describe, expect, it } from 'vitest';
import { fieldConditionMatches, getFormFields, getFormSteps, getSuccessAction } from './form-fields';

describe('conversion form configuration', () => {
    it('normalizes fields into ordered steps', () => {
        const steps = getFormSteps({
            multiStep: true,
            fields: [
                { id: 'email', name: 'email', label: 'Email', type: 'email', required: true, step: 1 },
                { id: 'company', name: 'company', label: 'Company', type: 'text', required: false, step: 2 },
            ],
        });

        expect(steps).toHaveLength(2);
        expect(steps[1][0].name).toBe('company');
    });

    it('evaluates conditions and rejects unsafe success URLs', () => {
        const field = {
            id: 'size',
            name: 'size',
            label: 'Size',
            type: 'text' as const,
            required: false,
            condition: { field: 'plan', operator: 'equals' as const, value: 'pro' },
        };

        expect(fieldConditionMatches(field, { plan: 'pro' })).toBe(true);
        expect(fieldConditionMatches(field, { plan: 'free' })).toBe(false);
        expect(getSuccessAction({ successAction: 'redirect', successUrl: 'javascript:alert(1)' })).toEqual({ type: 'message' });
        expect(getSuccessAction({ successAction: 'download', successUrl: 'https://example.com/guide.pdf' })).toEqual({
            type: 'download',
            url: 'https://example.com/guide.pdf',
        });

    });

    it('keeps branch-evaluation forms limited to their quiz fields', () => {
        const fields = getFormFields({
            branchStepSlug: 'developer-quiz',
            fields: [
                { id: 'experience', name: 'experience', label: 'Experience', type: 'select', options: ['beginner'], required: true },
                { id: 'timeline', name: 'timeline', label: 'Timeline', type: 'select', options: ['soon'], required: true },
            ],
        });

        expect(fields.map((field) => field.name)).toEqual(['experience', 'timeline']);
    });
});
