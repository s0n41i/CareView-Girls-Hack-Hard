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
  const [snoozed, setSnoozed] = useState<typeof initial>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const shown = items.filter((a) => filter === "All" || (filter === "Urgent" ? a.kind === "urgent" : a.kind === "device"));
  const done = (id: number) => { setItems((s) => s.filter((a) => a.id !== id)); setOpenId(null); toast("Marked as done"); };
  const snooze = (id: number) => {
    const a = items.find((x) => x.id === id); if (!a) return;
    setItems((s) => s.filter((x) => x.id !== id)); setSnoozed((s) => [a, ...s]); setOpenId(null); toast("Snoozed for 1 hour");
  };
  const undo = (id: number) => {
    const a = snoozed.find((x) => x.id === id); if (!a) return;
    setSnoozed((s) => s.filter((x) => x.id !== id)); setItems((s) => [...s, a].sort((x, y) => x.id - y.id));
  };

  return (
    <AppShell title="Alerts" subtitle={`${items.length} active`}>
      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-full border px-4 py-1.5 text-base", filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
            {f}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {shown.map((a) => (
          <li key={a.id} className="rounded-2xl bg-card p-4">
            <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="flex w-full items-start gap-3 text-left">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full",
                a.kind === "urgent" ? "bg-urgent-soft text-destructive" : a.kind === "device" ? "bg-muted text-muted-foreground" : "bg-warning-soft text-warning")}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium">{a.msg}</p>
                <p className="text-sm text-muted-foreground">{a.time}</p>
              </div>
            </button>
            {openId === a.id && (
              <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">{details[a.msg]}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => done(a.id)} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-3 font-medium text-primary-foreground">
                <Check className="h-4 w-4" /> Done
              </button>
              <button onClick={() => snooze(a.id)} className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 font-medium text-secondary-foreground">
                <Clock className="h-4 w-4" /> Snooze 1 hr
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && <p className="py-12 text-center text-muted-foreground">All clear for now.</p>}
      </ul>
      {snoozed.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Snoozed</h2>
          <ul className="space-y-2">
            {snoozed.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 opacity-80">
                <a.icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 font-medium">{a.msg}</span>
                <button onClick={() => undo(a.id)} className="rounded-full border px-3 py-1 text-sm text-primary">Undo</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}

const details: Record<string, string> = {
  "Check needed": "The comfort sensor suggests a check would be helpful.",
  "Low intake by 2 pm": "Intake is below the usual amount for this time. A drink may help.",
  "Device offline": "The drink coaster hasn't connected for 20 minutes.",
  "Low battery": "The sensor battery is low. Please charge it soon.",
};
