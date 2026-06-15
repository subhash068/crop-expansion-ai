import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Satellite, MapPin, BarChart3, Sprout, Map,
  CloudRain, Mountain, BadgeCheck, MessageSquare, Globe2,
  Bot, FileText, Settings, Leaf, Sun, Moon, Bell, Search,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { to: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  { to: "/crop-mapping", label: "Crop Mapping Center", icon: Satellite },
  { to: "/parcels", label: "Parcel Intelligence", icon: MapPin },
  { to: "/distribution", label: "Crop Distribution", icon: BarChart3 },
  { to: "/diversification", label: "Diversification Engine", icon: Sprout },
  { to: "/suitability", label: "Suitability Mapping", icon: Map },
  { to: "/weather", label: "Weather Intelligence", icon: CloudRain },
  { to: "/soil", label: "Soil Intelligence", icon: Mountain },
  { to: "/schemes", label: "Scheme Monitoring", icon: BadgeCheck },
  { to: "/advisory", label: "Advisory Center", icon: MessageSquare },
  { to: "/gis", label: "GIS Map Center", icon: Globe2 },
  { to: "/copilot", label: "AI Copilot", icon: Bot },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Leaf className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">CropVision AI</div>
              <div className="text-[10px] text-muted-foreground tracking-wide uppercase">AP Agri Dept</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
                  />
                )}
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-[11px] text-muted-foreground">
          District: <span className="text-foreground font-medium">Anantapur</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 md:px-6 gap-3">
          <div className="md:hidden flex items-center gap-2">
            <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Leaf className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">CropVision AI</span>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder="Search parcel, village, mandal..."
                className="w-full h-9 rounded-lg bg-muted/50 border border-border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="size-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button className="size-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
            </button>
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
              AO
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
