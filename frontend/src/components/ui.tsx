import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const map = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    danger: "btn-ghost text-red-700",
  };
  return <button className={cn(map[variant], className)} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input min-h-32", props.className)} {...props} />;
}

export function Badge({
  children,
  tone = "ink",
  className,
}: {
  children: React.ReactNode;
  tone?: "ink" | "copper" | "moss" | "muted";
  className?: string;
}) {
  const tones = {
    ink: "bg-ink/90 text-cream",
    copper: "bg-copper text-white",
    moss: "bg-moss text-white",
    muted: "bg-paper-2 text-ink",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface rounded-3xl p-6", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface rounded-3xl px-6 py-16 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  const n = Math.round(value);
  return (
    <span className="text-copper" aria-label={`${value} out of 5`}>
      {"★".repeat(n)}
      <span className="opacity-30">{"★".repeat(5 - n)}</span>
    </span>
  );
}
