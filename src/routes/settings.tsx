import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { User, Bell, Cpu, Users, Lock, HelpCircle, ChevronDown, BatteryMedium, Signal, Plus, Minus, Info, Droplet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSensorStatus, signalLabel } from "@/hooks/use-sensor-status";

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

function AlertsPanel() {
  const [night, setNight] = useState(true);
  const [mins, setMins] = useState(20);
  const [goal, setGoal] = useState(8);
  const [hours, setHours] = useState(3);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">Daily lift goal</span>
        <div className="flex items-center gap-3">
          <button aria-label="Fewer" onClick={() => setGoal((g) => Math.max(1, g - 1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-display text-2xl font-semibold">{goal}</span>
          <button aria-label="More" onClick={() => setGoal((g) => Math.min(20, g + 1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div>
        <p className="mb-2 font-medium">Alert if not lifted for</p>
        <div className="grid grid-cols-3 rounded-full bg-muted p-1">
          {[2, 3, 4].map((h) => (
            <button key={h} onClick={() => setHours(h)}
              className={cn("rounded-full py-2 text-sm", hours === h ? "bg-card font-semibold shadow-sm" : "text-muted-foreground")}>{h} hours</button>
          ))}
        </div>
      </div>
      <p className="flex gap-2 rounded-xl bg-warning-soft p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        Lifts show the bottle has been picked up, not how much was drunk.
      </p>
      <label className="flex items-center justify-between gap-3">
        <span className="font-medium">Sensor alerts at night</span>
        <Switch checked={night} onCheckedChange={setNight} />
      </label>
      <div>
        <p className="mb-2 font-medium">Reminder after</p>
        <div className="grid grid-cols-3 rounded-full bg-muted p-1">
          {[10, 20, 30].map((m) => (
            <button key={m} onClick={() => setMins(m)}
              className={cn("rounded-full py-2 text-sm", mins === m ? "bg-card font-semibold shadow-sm" : "text-muted-foreground")}>{m} min</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DevicesPanel() {
  const { data: sensor } = useSensorStatus();
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Underwear sensor</p>
          <span className="text-sm text-muted-foreground">{!sensor ? "Not connected" : sensor.online ? "Online" : "Offline"}</span>
        </div>
        <div className="mt-2 flex gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><BatteryMedium className="h-4 w-4 text-primary" /> {sensor?.batteryPct != null ? `${sensor.batteryPct}%` : "—"}</span>
          <span className="flex items-center gap-1.5"><Signal className="h-4 w-4 text-primary" /> {signalLabel(sensor?.rssi ?? null)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted p-4">
        <span className="flex items-center gap-2 font-medium"><Droplet className="h-4 w-4 text-primary" /> Coaster</span>
        <span className="text-sm text-muted-foreground">Online</span>
      </div>
      <Link to="/setup" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground">
        <Plus className="h-4 w-4" /> Pair new sensor
      </Link>
    </div>
  );
}

function SettingsPage() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <AppShell title="Settings">
      <ul className="divide-y overflow-hidden rounded-2xl bg-card">
        {rows.map(({ icon: Icon, label, hint }) => {
          const isOpen = open === label;
          return (
            <li key={label}>
              <button onClick={() => setOpen(isOpen ? null : label)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Icon className="h-4 w-4" /></span>
                <span className="flex-1 text-lg font-medium">{label}</span>
                {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  {label === "Alerts" ? <AlertsPanel /> : label === "Devices" ? <DevicesPanel /> :
                    <p className="text-sm text-muted-foreground">More options coming soon.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
