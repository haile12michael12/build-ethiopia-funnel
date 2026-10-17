import type { FunnelRule, FunnelStepBranchConfiguration } from '@/types/editor';
import { GitBranch, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FunnelBranchingModalProps {
    isOpen: boolean;
    onClose: () => void;
    value: Record<string, FunnelStepBranchConfiguration>;
    onSave: (branches: Record<string, FunnelStepBranchConfiguration>) => void;
}

const operators = new Set([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'notIn',
    'contains',
    'startsWith',
    'endsWith',
    'exists',
    'empty',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRule(value: unknown, depth = 0): value is FunnelRule {
    if (!isRecord(value) || depth > 10) return false;
    const hasLeaf = 'field' in value || 'operator' in value;
    const hasGroup = 'all' in value || 'any' in value || 'not' in value;
    if (!hasLeaf && !hasGroup) return false;
    if (hasLeaf && (typeof value.field !== 'string' || typeof value.operator !== 'string' || !operators.has(value.operator))) return false;
    if ('all' in value && (!Array.isArray(value.all) || !value.all.every((rule) => isRule(rule, depth + 1)))) return false;
    if ('any' in value && (!Array.isArray(value.any) || !value.any.every((rule) => isRule(rule, depth + 1)))) return false;
    if ('not' in value && !isRule(value.not, depth + 1)) return false;
    return true;
}

function isBranchConfiguration(value: unknown): value is Record<string, FunnelStepBranchConfiguration> {
    if (!isRecord(value)) return false;
    return Object.entries(value).every(([stepSlug, configuration]) => {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stepSlug) || !isRecord(configuration)) return false;
        if (typeof configuration.defaultNextStepSlug !== 'string' || !Array.isArray(configuration.branches)) return false;
        return configuration.branches.every(
            (branch) =>
                isRecord(branch) &&
                typeof branch.name === 'string' &&
                Number.isInteger(branch.priority) &&
                isRule(branch.when) &&
                typeof branch.nextStepSlug === 'string',
        );
    });
}

export default function FunnelBranchingModal({ isOpen, onClose, value, onSave }: FunnelBranchingModalProps) {
    const [json, setJson] = useState(() => JSON.stringify(value, null, 2));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setJson(JSON.stringify(value, null, 2));
            setError(null);
        }
    }, [isOpen, value]);

    if (!isOpen) return null;

    const save = () => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(json) as unknown;
        } catch {
            setError('Enter valid JSON before saving.');
            return;
        }

        if (!isBranchConfiguration(parsed)) {
            setError('Each step needs a defaultNextStepSlug and branches with a name, integer priority, rule, and nextStepSlug.');
            return;
        }

        onSave(parsed);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <GitBranch className="h-5 w-5 text-primary" /> Step branching
                        </h2>
                        <p className="text-sm text-muted-foreground">The server evaluates rules by priority and records the selected route.</p>
                    </div>
                    <button onClick={onClose} className="rounded p-2 text-muted-foreground hover:bg-muted" aria-label="Close branching settings">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-3 overflow-y-auto p-6">
                    <p className="text-sm text-muted-foreground">
                        Configure a map keyed by step slug. Rules can use nested <code>all</code>, <code>any</code>, and <code>not</code> groups.
                        Destinations must be published funnels owned by this account.
                    </p>
                    <textarea
                        value={json}
                        onChange={(event) => setJson(event.target.value)}
                        spellCheck={false}
                        className="min-h-80 w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        aria-label="Funnel branching JSON"
                    />
                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
                            Cancel
                        </button>
                        <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            Save branches
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
