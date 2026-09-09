import { BadgeCheck, Lock, RefreshCcw, Zap } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "Secure checkout" },
  { icon: Zap, label: "Instant delivery" },
  { icon: RefreshCcw, label: "14-day guarantee" },
  { icon: BadgeCheck, label: "Telebirr · Chapa ready" },
];

export function TrustBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {BADGES.map((b) => (
        <div key={b.label} className="flex items-center gap-2 rounded-2xl border hairline px-3 py-2 text-xs text-muted">
          <b.icon className="h-4 w-4 shrink-0 text-copper" />
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
