import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function KpiCard({
  label, value, icon: Icon, hint, trend, delay = 0, accent = "primary",
}: {
  label: string; value: ReactNode; icon?: LucideIcon; hint?: string;
  trend?: { value: string; positive?: boolean };
  delay?: number; accent?: "primary" | "accent" | "info" | "warning";
}) {
  const accentColor =
    accent === "accent" ? "var(--color-accent)"
    : accent === "info" ? "var(--color-info)"
    : accent === "warning" ? "var(--color-warning)"
    : "var(--color-primary)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass rounded-xl p-4 relative overflow-hidden group"
    >
      <div
        className="absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        {Icon && (
          <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklab, ${accentColor} 18%, transparent)` }}>
            <Icon className="size-4" style={{ color: accentColor }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function Section({ title, subtitle, action, children, className = "" }: {
  title: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={`glass rounded-xl p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" }) {
  const colors = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-info/15 text-info border-info/30",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${colors}`}>
      {children}
    </span>
  );
}
