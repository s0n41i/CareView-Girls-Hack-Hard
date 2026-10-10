// Server-only storage for sensor devices.
//
// This is an in-memory store: fine for local development and a single long-running
// Node/Bun process, but NOT durable on serverless/edge hosting (Cloudflare, which the
// Lovable build targets by default, runs many short-lived isolates that don't share
// memory). For production, implement SensorStore against a real database
// (e.g. Supabase / Lovable Cloud, Cloudflare D1 or Durable Objects) and swap it in
// `getSensorStore()`; nothing else needs to change.

import {
  applyReading,
  DEFAULT_CALIBRATION,
  DEFAULT_THRESHOLDS,
  initialSensorState,
  toMoisturePct,
  type Calibration,
  type Reading,
  type SensorState,
  type Thresholds,
} from "./detection";
import type { DeviceStatus, IngestPayload } from "./types";

/** The firmware posts every 30 s; treat 3 missed posts as offline. */
const OFFLINE_AFTER_MS = 90_000;
const MAX_READINGS = 2_880; // ~24 h at one reading every 30 s

type DeviceRecord = {
  id: string;
  calibration: Calibration;
  thresholds: Thresholds;
  state: SensorState;
  readings: Reading[];
  lastSeen: number;
  batteryPct: number | null;
  rssi: number | null;
  firmware: string | null;
};

export interface SensorStore {
  ingest(deviceId: string, payload: IngestPayload, now?: number): Promise<DeviceStatus>;
  getStatus(deviceId: string, now?: number): Promise<DeviceStatus | null>;
  listDevices(now?: number): Promise<DeviceStatus[]>;
}

function envNumber(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== "" && process.env[name] != null ? v : fallback;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toStatus(r: DeviceRecord, now: number): DeviceStatus {
  const latest = r.readings.at(-1) ?? null;
  const dayStart = startOfDay(now);
  const lastChange =
    [...r.state.episodes].reverse().find((e) => e.endedAt !== null)?.endedAt ?? null;
  const open = r.state.wet ? (r.state.episodes.at(-1) ?? null) : null;
  return {
    deviceId: r.id,
    online: now - r.lastSeen <= OFFLINE_AFTER_MS,
    lastSeen: r.lastSeen,
    batteryPct: r.batteryPct,
    rssi: r.rssi,
    firmware: r.firmware,
    moisturePct: latest?.moisturePct ?? null,
    raw: latest?.raw ?? null,
    needsCheck: r.state.wet,
    needsCheckSince: open?.startedAt ?? null,
    lastChangeAt: lastChange,
    eventsToday: r.state.episodes.filter((e) => e.startedAt >= dayStart).length,
    recent: r.readings.slice(-60).map(({ at, moisturePct }) => ({ at, moisturePct })),
  };
}

class MemorySensorStore implements SensorStore {
  private devices = new Map<string, DeviceRecord>();

  private getOrCreate(id: string, now: number): DeviceRecord {
    let r = this.devices.get(id);
    if (!r) {
      r = {
        id,
        calibration: {
          dryRaw: envNumber("SENSOR_DRY_RAW", DEFAULT_CALIBRATION.dryRaw),
          wetRaw: envNumber("SENSOR_WET_RAW", DEFAULT_CALIBRATION.wetRaw),
        },
        thresholds: {
          wetOnPct: envNumber("SENSOR_WET_ON_PCT", DEFAULT_THRESHOLDS.wetOnPct),
          wetOffPct: envNumber("SENSOR_WET_OFF_PCT", DEFAULT_THRESHOLDS.wetOffPct),
          confirmReadings: envNumber("SENSOR_CONFIRM_READINGS", DEFAULT_THRESHOLDS.confirmReadings),
        },
        state: initialSensorState(),
        readings: [],
        lastSeen: now,
        batteryPct: null,
        rssi: null,
        firmware: null,
      };
      this.devices.set(id, r);
    }
    return r;
  }

  async ingest(deviceId: string, p: IngestPayload, now = Date.now()) {
    const r = this.getOrCreate(deviceId, now);
    const reading: Reading = {
      at: now,
      raw: p.raw,
      moisturePct: toMoisturePct(p.raw, r.calibration),
    };
    r.state = applyReading(r.state, reading, r.thresholds);
    r.readings.push(reading);
    if (r.readings.length > MAX_READINGS) r.readings.splice(0, r.readings.length - MAX_READINGS);
    r.lastSeen = now;
    r.batteryPct = p.batteryPct ?? r.batteryPct;
    r.rssi = p.rssi ?? r.rssi;
    r.firmware = p.firmware ?? r.firmware;
    return toStatus(r, now);
  }

  async getStatus(deviceId: string, now = Date.now()) {
    const r = this.devices.get(deviceId);
    return r ? toStatus(r, now) : null;
  }

  async listDevices(now = Date.now()) {
    return [...this.devices.values()].map((r) => toStatus(r, now));
  }
}

// Kept on globalThis so Vite's dev-server HMR doesn't wipe it on every edit.
const g = globalThis as typeof globalThis & { __sensorStore?: SensorStore };

export function getSensorStore(): SensorStore {
  return (g.__sensorStore ??= new MemorySensorStore());
}

/** Constant-time comparison so the device token can't be guessed byte by byte. */
export function checkDeviceToken(request: Request): "ok" | "unconfigured" | "denied" {
  const expected = process.env["DEVICE_TOKEN"];
  if (!expected) return "unconfigured";
  const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (got.length !== expected.length) return "denied";
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? "ok" : "denied";
}
