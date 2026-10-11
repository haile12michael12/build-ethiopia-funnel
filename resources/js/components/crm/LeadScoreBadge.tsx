interface LeadScoreBadgeProps {
    score: number;
}

export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
    const tone = score >= 70 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : score >= 40 ? 'border-amber-500/20 bg-amber-500/10 text-amber-600' : 'border-border bg-muted text-muted-foreground';

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
            Score {score}/100
        </span>
    );
}
