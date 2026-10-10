import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Share2, Timer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — CareView" },
      { name: "description", content: "Daily intake against target and sensor activity over time." },
      { property: "og:title", content: "History — CareView" },
      { property: "og:description", content: "Daily intake against target and sensor activity over time." },
    ],
  }),
  component: History,
});

const data = {
  Day: { labels: ["8a", "10a", "12p", "2p", "4p", "6p", "8p"], values: [200, 150, 250, 100, 150, 0, 0], target: 220, events: [[0,0],[1,0],[0,0],[1,0],[0,1],[0,0],[0,0]] as [number,number][] },
  Week: { labels: ["M", "T", "W", "T", "F", "S", "S"], values: [1400, 1550, 1200, 1600, 1350, 1100, 850], target: 1500, events: [[3,1],[3,0],[4,1],[2,1],[3,1],[4,0],[2,1]] as [number,number][] },
  Month: { labels: ["W1", "W2", "W3", "W4"], values: [1450, 1380, 1520, 1300], target: 1500, events: [[3,1],[3,1],[3,0],[3,1]] as [number,number][] },
};
type Range = keyof typeof data;

function History() {
  const [range, setRange] = useState<Range>("Week");
  const d = data[range];
  const max = Math.max(...d.values, d.target) * 1.15;
  return (
    <AppShell title="History" subtitle="Margaret">
      <div className="grid grid-cols-3 rounded-full bg-muted p-1">
        {(Object.keys(data) as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={cn("rounded-full py-2 text-sm", range === r ? "bg-card font-semibold shadow-sm" : "text-muted-foreground")}>{r}</button>
        ))}
      </div>
      <section className="mt-4 rounded-2xl bg-card p-5">
        <p className="text-sm text-muted-foreground">Intake (ml)</p>
        <div className="relative mt-4 h-48">
          <div className="absolute inset-x-0 border-t-2 border-dashed border-warning" style={{ bottom: `${(d.target / max) * 100}%` }}>
            <span className="absolute -top-5 right-0 text-xs text-warning">Target {d.target}</span>
          </div>
          <div className="flex h-full items-end gap-2">
            {d.values.map((v, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-primary/80" style={{ height: `${(v / max) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          {d.labels.map((l, i) => <span key={i} className="flex-1 text-center text-xs text-muted-foreground">{l}</span>)}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Sensor events</p>
        <div className="mt-2 flex gap-2">
          {d.events.map(([wet, soiled], i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              {Array.from({ length: wet }).map((_, j) => <span key={"w"+j} className="h-2.5 w-2.5 rounded-full bg-warning" />)}
              {Array.from({ length: soiled }).map((_, j) => <span key={"s"+j} className="h-2.5 w-2.5 rounded-full bg-destructive" />)}
              {wet + soiled === 0 && <span className="h-2.5 w-2.5 rounded-full bg-muted" />}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Wet</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Soiled</span>
        </div>
      </section>
      <section className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Timer className="h-5 w-5" /></span>
        <div>
          <p className="text-sm text-muted-foreground">Average time to change</p>
          <p className="font-display text-2xl font-semibold">18 min</p>
        </div>
      </section>
      <button onClick={() => toast("Report ready to share")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground">
        <Share2 className="h-4 w-4" /> Share report
      </button>
    </AppShell>
  );
}
