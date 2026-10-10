import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeartHandshake, Droplet, WifiOff, BatteryLow, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — CareView" },
      { name: "description", content: "Gentle care reminders and device alerts, newest first." },
      { property: "og:title", content: "Alerts — CareView" },
      { property: "og:description", content: "Gentle care reminders and device alerts, newest first." },
    ],
  }),
  component: Alerts,
});

type Kind = "urgent" | "device" | "care";
const initial = [
  { id: 1, kind: "urgent" as Kind, icon: HeartHandshake, msg: "Check needed", time: "1:28 pm" },
  { id: 2, kind: "care" as Kind, icon: Droplet, msg: "Low intake by 2 pm", time: "12:45 pm" },
  { id: 3, kind: "device" as Kind, icon: WifiOff, msg: "Device offline", time: "11:10 am" },
  { id: 4, kind: "device" as Kind, icon: BatteryLow, msg: "Low battery", time: "9:02 am" },
];
const filters = ["All", "Urgent", "Devices"] as const;

function Alerts() {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const shown = items.filter((a) => filter === "All" || (filter === "Urgent" ? a.kind === "urgent" : a.kind === "device"));
  const remove = (id: number, label: string) => { setItems((s) => s.filter((a) => a.id !== id)); toast(label); };

  return (
    <AppShell title="Alerts" subtitle={`${items.length} active`}>
      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-full border px-4 py-1.5 text-sm", filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
            {f}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {shown.map((a) => (
          <li key={a.id} className="rounded-2xl bg-card p-4">
            <div className="flex items-start gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full",
                a.kind === "urgent" ? "bg-urgent-soft text-destructive" : a.kind === "device" ? "bg-muted text-muted-foreground" : "bg-warning-soft text-warning")}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{a.msg}</p>
                <p className="text-sm text-muted-foreground">{a.time}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => remove(a.id, "Marked as done")} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground">
                <Check className="h-4 w-4" /> Done
              </button>
              <button onClick={() => remove(a.id, "Snoozed for 1 hour")} className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-medium text-secondary-foreground">
                <Clock className="h-4 w-4" /> Snooze 1 hr
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && <p className="py-12 text-center text-muted-foreground">All clear for now.</p>}
      </ul>
    </AppShell>
  );
}
