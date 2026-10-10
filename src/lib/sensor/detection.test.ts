import { describe, expect, it } from "vitest";
import { applyReading, initialSensorState, toMoisturePct, type Thresholds } from "./detection";

const cal = { dryRaw: 3200, wetRaw: 1300 };
const t: Thresholds = { wetOnPct: 35, wetOffPct: 15, confirmReadings: 2 };
const feed = (pcts: number[]) =>
  pcts.reduce(
    (s, moisturePct, i) => applyReading(s, { at: i, raw: 0, moisturePct }, t),
    initialSensorState(),
  );

describe("toMoisturePct", () => {
  it("maps dry to 0, wet to 100 and clamps outside the range", () => {
    expect(toMoisturePct(3200, cal)).toBe(0);
    expect(toMoisturePct(1300, cal)).toBe(100);
    expect(toMoisturePct(2250, cal)).toBe(50);
    expect(toMoisturePct(4095, cal)).toBe(0);
    expect(toMoisturePct(0, cal)).toBe(100);
  });
});

describe("applyReading", () => {
  it("needs consecutive wet readings before opening an episode", () => {
    expect(feed([40]).wet).toBe(false);
    expect(feed([40, 10, 40]).wet).toBe(false);
    const s = feed([40, 45]);
    expect(s.wet).toBe(true);
    expect(s.episodes).toEqual([{ startedAt: 1, endedAt: null }]);
  });

  it("stays wet in the hysteresis band and closes once dry", () => {
    expect(feed([40, 45, 25, 20]).wet).toBe(true);
    const s = feed([40, 45, 25, 12]);
    expect(s.wet).toBe(false);
    expect(s.episodes).toEqual([{ startedAt: 1, endedAt: 3 }]);
  });

  it("counts separate episodes", () => {
    expect(feed([50, 50, 5, 50, 50]).episodes).toHaveLength(2);
  });
});
