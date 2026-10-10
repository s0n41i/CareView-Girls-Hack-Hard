// Pure moisture-detection logic for the underwear sensor. No I/O here so it can be
// unit-tested and reused by whichever store backs the API.

export type Calibration = {
  /** Raw ADC reading with the probe completely dry (in air). */
  dryRaw: number;
  /** Raw ADC reading with the probe soaked. */
  wetRaw: number;
};

export type Thresholds = {
  /** Moisture % at or above which a reading counts as wet. */
  wetOnPct: number;
  /** Moisture % at or below which the pad counts as changed/dry again. */
  wetOffPct: number;
  /** Consecutive wet readings needed before an episode opens (debounce). */
  confirmReadings: number;
};

// Soil hygrometers read *lower* when wetter (both the resistive YL-69 style and the
// capacitive v1.2 boards), so dryRaw > wetRaw. These defaults suit a 12-bit ESP32 ADC
// and should be replaced with values from your own probe (see firmware/README.md).
export const DEFAULT_CALIBRATION: Calibration = { dryRaw: 3200, wetRaw: 1300 };
export const DEFAULT_THRESHOLDS: Thresholds = { wetOnPct: 35, wetOffPct: 15, confirmReadings: 2 };

export type Reading = {
  at: number; // epoch ms (server receive time)
  raw: number;
  moisturePct: number;
};

export type Episode = {
  startedAt: number;
  /** Set when moisture drops back below wetOffPct, i.e. the pad was changed. */
  endedAt: number | null;
};

export type SensorState = {
  wet: boolean;
  /** Consecutive readings at or above wetOnPct while not yet wet. */
  pendingWet: number;
  episodes: Episode[];
};

export const initialSensorState = (): SensorState => ({ wet: false, pendingWet: 0, episodes: [] });

export function toMoisturePct(raw: number, cal: Calibration): number {
  const span = cal.dryRaw - cal.wetRaw;
  if (span === 0) return 0;
  const pct = ((cal.dryRaw - raw) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

/**
 * Advance the state machine by one reading. Hysteresis (wetOn > wetOff) stops a
 * reading that hovers around one threshold from opening and closing episodes repeatedly.
 */
export function applyReading(state: SensorState, reading: Reading, t: Thresholds): SensorState {
  const episodes = [...state.episodes];
  if (state.wet) {
    if (reading.moisturePct <= t.wetOffPct) {
      const last = episodes.at(-1);
      if (last && last.endedAt === null)
        episodes[episodes.length - 1] = { ...last, endedAt: reading.at };
      return { wet: false, pendingWet: 0, episodes };
    }
    return { ...state, episodes };
  }
  if (reading.moisturePct >= t.wetOnPct) {
    const pendingWet = state.pendingWet + 1;
    if (pendingWet >= t.confirmReadings) {
      episodes.push({ startedAt: reading.at, endedAt: null });
      return { wet: true, pendingWet: 0, episodes };
    }
    return { ...state, pendingWet };
  }
  return { ...state, pendingWet: 0 };
}
