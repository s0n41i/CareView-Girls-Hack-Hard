import { useQuery } from "@tanstack/react-query";
import type { DeviceStatus } from "@/lib/sensor/types";

/** Polls the backend for the underwear sensor's live state. */
export function useSensorStatus() {
  return useQuery({
    queryKey: ["sensor-status"],
    queryFn: async (): Promise<DeviceStatus | null> => {
      const res = await fetch("/api/sensor/status");
      if (!res.ok) throw new Error(`Sensor status ${res.status}`);
      const devices = (await res.json()) as DeviceStatus[];
      // One underwear sensor per patient for now: show the most recently seen.
      return devices.sort((a, b) => b.lastSeen - a.lastSeen)[0] ?? null;
    },
    refetchInterval: 5_000,
  });
}

export const formatTime = (ms: number) =>
  new Date(ms)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();

export function signalLabel(rssi: number | null): string {
  if (rssi == null) return "—";
  if (rssi >= -60) return "Good";
  if (rssi >= -75) return "Fair";
  return "Weak";
}
