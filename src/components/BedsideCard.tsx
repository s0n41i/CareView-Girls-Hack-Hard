import { useRef, useState } from "react";
import { BedDouble, ShieldCheck, Music, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSensorStatus, formatTime } from "@/hooks/use-sensor-status";

const sounds = ["Gentle rain", "Soft waves", "Lullaby"] as const;
type Sound = (typeof sounds)[number];

function startSound(kind: Sound) {
  const ctx = new AudioContext();
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2);
  out.connect(ctx.destination);
  if (kind === "Lullaby") {
    const notes = [523, 659, 784, 659, 587, 523, 494, 523];
    let t = ctx.currentTime;
    for (let r = 0; r < 20; r++) for (const f of notes) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 0.9);
      o.connect(g).connect(out); o.start(t); o.stop(t + 1); t += 0.9;
    }
  } else {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = kind === "Gentle rain" ? 1200 : 500;
    src.connect(filter).connect(out);
    if (kind === "Soft waves") {
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 0.12; lg.gain.value = 0.1; lfo.connect(lg).connect(out.gain); lfo.start();
    }
    src.start();
  }
  return ctx;
}

function UnderwearSensorRow() {
  const { data: sensor, isPending, isError } = useSensorStatus();
  const tone = !sensor || !sensor.online ? "offline" : sensor.needsCheck ? "check" : "fine";
  const text = isPending ? "Connecting…"
    : isError ? "Can't reach the server"
    : !sensor ? "Waiting for sensor"
    : !sensor.online ? `Offline · last seen ${formatTime(sensor.lastSeen)}`
    : sensor.needsCheck ? `Check needed since ${formatTime(sensor.needsCheckSince ?? sensor.lastSeen)}`
    : sensor.lastChangeAt ? `All fine · last change ${formatTime(sensor.lastChangeAt)}` : "All fine";
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-4", tone === "check" ? "bg-warning-soft" : "bg-card")}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><ShieldCheck className="h-5 w-5" /></span>
      <div className="flex-1">
        <p className="font-medium">Underwear sensor</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <span className={cn("h-2.5 w-2.5 rounded-full", tone === "fine" ? "bg-primary" : tone === "check" ? "bg-warning" : "bg-muted-foreground")} />
    </div>
  );
}

export function BedsideCard() {
  const [sound, setSound] = useState<Sound>("Gentle rain");
  const [playing, setPlaying] = useState(false);
  const ctx = useRef<AudioContext | null>(null);

  const toggle = () => {
    if (playing) { ctx.current?.close(); ctx.current = null; setPlaying(false); return; }
    ctx.current = startSound(sound); setPlaying(true);
    toast(`Playing "${sound}" at the bedside`);
  };

  return (
    <section className="mt-4 space-y-3">
      <h2 className="text-lg font-semibold">Sensors</h2>
      <UnderwearSensorRow />
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><BedDouble className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="font-medium">Bedside sensor</p>
            <p className="text-sm text-muted-foreground">Restless · 2 movements in last hour</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {sounds.map((s) => (
            <button key={s} onClick={() => setSound(s)} disabled={playing}
              className={cn("flex-1 rounded-full border px-2 py-1.5 text-xs", sound === s ? "border-primary bg-accent text-accent-foreground font-semibold" : "text-muted-foreground")}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={toggle}
          className={cn("mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium",
            playing ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground")}>
          {playing ? <><Square className="h-4 w-4" /> Stop sound</> : <><Music className="h-4 w-4" /> Play soothing sound</>}
        </button>
      </div>
    </section>
  );
}
