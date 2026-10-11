import { type AuditOption } from '@/types/business-audit';

interface ServiceInterestSelectorProps {
    value: string[];
    options: AuditOption[];
    error?: string;
    onChange: (value: string[]) => void;
}

export function ServiceInterestSelector({ value, options, error, onChange }: ServiceInterestSelectorProps) {
    const toggle = (service: string) => {
        onChange(value.includes(service) ? value.filter((item) => item !== service) : [...value, service]);
    };

    return (
        <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Which areas would you like help with?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
                {options.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-muted/50">
                        <input
                            type="checkbox"
                            checked={value.includes(option.value)}
                            onChange={() => toggle(option.value)}
                            className="h-4 w-4 rounded border-border accent-primary"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </fieldset>
    );
}
