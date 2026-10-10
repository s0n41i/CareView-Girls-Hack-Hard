import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplet, Activity, Wifi, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BedsideCard } from "@/components/BedsideCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — CareView" },
      { name: "description", content: "A calm overview of today's care: intake, sensor activity and devices." },
      { property: "og:title", content: "Today — CareView" },
      { property: "og:description", content: "A calm overview of today's care: intake, sensor activity and devices." },
    ],
  }),
  component: Today,
});

function Today() {
  const intake = 850, target = 1500;
  return (
    <AppShell title="Margaret" subtitle="Saturday, 10 October">
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm opacity-90"><Droplet className="h-4 w-4" /> Intake today</div>
        <p className="mt-2 font-display text-4xl font-semibold">{intake} <span className="text-lg opacity-80">/ {target} ml</span></p>
        <div className="mt-4 h-2 rounded-full bg-primary-foreground/25">
          <div className="h-2 rounded-full bg-primary-foreground" style={{ width: `${(intake / target) * 100}%` }} />
        </div>
      </section>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4">
          <Activity className="h-5 w-5 text-primary" />
          <p className="mt-3 font-display text-2xl font-semibold">3</p>
          <p className="text-sm text-muted-foreground">Sensor events</p>
        </div>
        <div className="rounded-2xl bg-card p-4">
          <Wifi className="h-5 w-5 text-primary" />
          <p className="mt-3 font-display text-2xl font-semibold">2 / 3</p>
          <p className="text-sm text-muted-foreground">Devices online</p>
        </div>
      </div>
      <BedsideCard />
      <Link to="/alerts" className="mt-4 flex items-center justify-between rounded-2xl bg-warning-soft p-4">
        <span className="font-medium">2 alerts need attention</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </AppShell>
  );
}
