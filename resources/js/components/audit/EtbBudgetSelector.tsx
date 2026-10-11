import { type AuditOption } from '@/types/business-audit';

interface EtbBudgetSelectorProps {
    value: string;
    options: AuditOption[];
    error?: string;
    onChange: (value: string) => void;
}

export function EtbBudgetSelector({ value, options, error, onChange }: EtbBudgetSelectorProps) {
    return (
        <label className="block space-y-2 text-sm font-semibold text-foreground">
            Approximate project budget (ETB)
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
            >
                <option value="">Choose a range</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <span className="block text-xs font-normal text-destructive">{error}</span>}
        </label>
    );
}
