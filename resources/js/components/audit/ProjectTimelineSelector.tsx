import { type AuditOption } from '@/types/business-audit';

interface ProjectTimelineSelectorProps {
    value: string;
    options: AuditOption[];
    error?: string;
    onChange: (value: string) => void;
}

export function ProjectTimelineSelector({ value, options, error, onChange }: ProjectTimelineSelectorProps) {
    return (
        <label className="block space-y-2 text-sm font-semibold text-foreground">
            When would you like to get started?
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
            >
                <option value="">Choose a timeline</option>
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
