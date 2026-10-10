import { Link } from "@tanstack/react-router";
import { Home, Bell, BarChart3, Settings } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Today", icon: Home },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/history", label: "History", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="px-5 pb-4 pt-8">
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      </header>
      <main className="flex-1 px-5 pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: true }}
                className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
                activeProps={{ className: "text-primary font-semibold" }}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
