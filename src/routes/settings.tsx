import { createFileRoute } from "@tanstack/react-router";
import { User, Bell, Cpu, Users, Lock, HelpCircle, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CareView" },
      { name: "description", content: "Manage patient details, alerts, devices, carers and privacy." },
      { property: "og:title", content: "Settings — CareView" },
      { property: "og:description", content: "Manage patient details, alerts, devices, carers and privacy." },
    ],
  }),
  component: SettingsPage,
});

const rows = [
  { icon: User, label: "Patient", hint: "Margaret" },
  { icon: Bell, label: "Alerts", hint: "4 types on" },
  { icon: Cpu, label: "Devices", hint: "3 paired" },
  { icon: Users, label: "Carers", hint: "2 people" },
  { icon: Lock, label: "Privacy" },
  { icon: HelpCircle, label: "Help" },
];

function SettingsPage() {
  return (
    <AppShell title="Settings">
      <ul className="divide-y overflow-hidden rounded-2xl bg-card">
        {rows.map(({ icon: Icon, label, hint }) => (
          <li key={label}>
            <button className="flex w-full items-center gap-3 px-4 py-4 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Icon className="h-4 w-4" /></span>
              <span className="flex-1 font-medium">{label}</span>
              {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
