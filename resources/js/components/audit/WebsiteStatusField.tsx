import { type AuditOption } from '@/types/business-audit';

interface WebsiteStatusFieldProps {
    value: string;
    options: AuditOption[];
    error?: string;
    onChange: (value: string) => void;
}

export function WebsiteStatusField({ value, options, error, onChange }: WebsiteStatusFieldProps) {
    return (
        <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">What is the status of your website?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${value === option.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                    >
                        <input
                            type="radio"
                            name="website_status"
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </fieldset>
    );
}
