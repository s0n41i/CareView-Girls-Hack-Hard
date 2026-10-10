import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, HeartHandshake, Droplet, QrCode, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Set up sensors — CareView" },
      { name: "description", content: "Pair the drink coaster and sensor in a few simple steps." },
      { property: "og:title", content: "Set up sensors — CareView" },
      { property: "og:description", content: "Pair the drink coaster and sensor in a few simple steps." },
    ],
  }),
  component: Setup,
});

function Setup() {
  const [step, setStep] = useState(0);
  const [scanned, setScanned] = useState(false);
  const steps = [
    { icon: HeartHandshake, title: "Welcome", body: "Let's connect the devices. This takes about two minutes." },
    { icon: Droplet, title: "Place the drink coaster", body: "Put the coaster on a flat surface near the bed and set the usual cup on it." },
    { icon: QrCode, title: "Scan the sensor QR code", body: "Hold the QR code on the sensor inside the frame." },
    { icon: CheckCircle2, title: "All set", body: "Everything is connected. You'll see readings on the Today screen." },
  ];
  const s = steps[step]!;
  const blocked = step === 2 && !scanned;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-5 py-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, i) => <span key={i} className={cn("h-2 w-8 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}
        </div>
        <Link to="/settings" aria-label="Close" className="rounded-full bg-card p-2"><X className="h-5 w-5" /></Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {step === 2 ? (
          <div className={cn("flex h-56 w-56 items-center justify-center rounded-3xl border-4 border-dashed", scanned ? "border-primary bg-accent" : "border-muted-foreground/40 bg-card")}>
            {scanned ? <CheckCircle2 className="h-16 w-16 text-primary" /> : <QrCode className="h-20 w-20 text-muted-foreground" />}
          </div>
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-primary"><s.icon className="h-12 w-12" /></span>
        )}
        <p className="mt-6 text-sm text-muted-foreground">Step {step + 1} of {steps.length}</p>
        <h1 className="mt-1 text-3xl font-semibold">{s.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{scanned && step === 2 ? "Sensor found and paired." : s.body}</p>
        {step === 2 && !scanned && (
          <button onClick={() => setScanned(true)} className="mt-5 rounded-full border border-primary px-5 py-2 font-medium text-primary">Simulate scan</button>
        )}
      </div>
      <div className="flex gap-3">
        {step > 0 && step < 3 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 rounded-xl bg-secondary py-3.5 text-lg font-medium text-secondary-foreground">Back</button>
        )}
        {step < 3 ? (
          <button disabled={blocked} onClick={() => setStep(step + 1)}
            className="flex-1 rounded-xl bg-primary py-3.5 text-lg font-medium text-primary-foreground disabled:opacity-40">Next</button>
        ) : (
          <Link to="/settings" className="flex-1 rounded-xl bg-primary py-3.5 text-center text-lg font-medium text-primary-foreground">Back to Settings</Link>
        )}
      </div>
    </div>
  );
}
