import { z } from "zod";

/** Body the Genesis Mini firmware POSTs to /api/device/readings. */
export const ingestSchema = z.object({
  deviceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[\w-]+$/),
  raw: z.number().int().min(0).max(4095),
  batteryPct: z.number().int().min(0).max(100).optional(),
  rssi: z.number().int().min(-127).max(0).optional(),
  firmware: z.string().max(32).optional(),
});
export type IngestPayload = z.infer<typeof ingestSchema>;

/** What the app reads from /api/sensor/status. */
export type DeviceStatus = {
  deviceId: string;
  online: boolean;
  lastSeen: number;
  batteryPct: number | null;
  rssi: number | null;
  firmware: string | null;
  moisturePct: number | null;
  raw: number | null;
  needsCheck: boolean;
  needsCheckSince: number | null;
  lastChangeAt: number | null;
  eventsToday: number;
  recent: { at: number; moisturePct: number }[];
};
