interface BusinessInformationFieldsProps {
    name: string;
    businessName: string;
    email: string;
    phone: string;
    website: string;
    errors: Record<string, string>;
    onChange: (field: 'name' | 'business_name' | 'email' | 'phone' | 'website', value: string) => void;
}

const fields = [
    { name: 'name', label: 'Your name', type: 'text', required: true },
    { name: 'business_name', label: 'Business name', type: 'text', required: true },
    { name: 'email', label: 'Work email', type: 'email', required: true },
    { name: 'phone', label: 'Phone number (Ethiopia)', type: 'tel', required: false },
    { name: 'website', label: 'Website URL (if available)', type: 'url', required: false },
] as const;

export function BusinessInformationFields({ name, businessName, email, phone, website, errors, onChange }: BusinessInformationFieldsProps) {
    const values = { name, business_name: businessName, email, phone, website };

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
                <label key={field.name} className="space-y-1.5 text-sm font-medium text-foreground">
                    {field.label}
                    <input
                        type={field.type}
                        required={field.required}
                        value={values[field.name]}
                        onChange={(event) => onChange(field.name, event.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        autoComplete={field.name === 'name' ? 'name' : field.name === 'email' ? 'email' : undefined}
                    />
                    {errors[field.name] && <span className="block text-xs font-normal text-destructive">{errors[field.name]}</span>}
                </label>
            ))}
        </div>
    );
}
