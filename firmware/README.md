# Underwear sensor firmware (Axiometa Genesis Mini + soil hygrometer)

```
hygrometer probe ──► Genesis Mini (ESP32-S3) ──Wi-Fi, POST every 30 s──► /api/device/readings
                                                                              │
                                    CareView app ◄── GET /api/sensor/status ◄─┘
```

The board only measures and reports. Calibration, wet/changed detection and the
offline check all run on the server, so they can be tuned without reflashing.

## Wiring (Port 1)

| Hygrometer pin | Genesis Mini | GPIO | Notes |
| --- | --- | --- | --- |
| AO (analog out) | `P1_IO0` | 4 | ADC1: works while Wi-Fi is on (ADC2 pins don't) |
| VCC | 3.3V | | Never 5V: AO would exceed the ESP32-S3's 3.3V input limit. Optional: move to `P1_IO1` (GPIO3) and set `PROBE_POWER_PIN = P1_IO1` to power the probe only while reading |
| GND | GND | | |
| DO (digital out) | not used | | |

Pins come from the board's Arduino variant (`variants/axiometa_genesis_mini/pins_arduino.h`).
Any of `P1`–`P3` IO0/IO1 and `P4_IO0` are ADC1 pins and would also work.

**Probe choice:** a *resistive* fork (the YL-69 / FC-28 kind) passes current through
the liquid, so it corrodes quickly in urine and leaves metal residue against skin. It's
fine for bench testing. For anything worn, use a *capacitive* probe (v1.2/v2.0
style), whose electrodes are sealed under solder mask, or a pair of conductive-thread
electrodes in the pad. The firmware and server work unchanged with either; only the
calibration numbers change.

## Sketches

- `moisture_bench_test/`: off-body bench test. Prints `MOISTURE_RAW:` once a second (average of ~50 samples). No Wi-Fi. Use it to check wiring and find your dry/damp values.
- `incontinence_sensor/`: the connected version that reports to the CareView backend.

Both use the same wiring.

## Build and flash

1. Arduino IDE → Boards Manager → install **esp32 by Espressif Systems** (3.x).
2. Select board **Axiometa Genesis Mini** and its port.
3. `cp secrets.example.h secrets.h` and fill in Wi-Fi, `API_BASE_URL` and `DEVICE_TOKEN`.
   For local dev, `API_BASE_URL` is your computer's LAN IP (`bun run dev` prints it
   as "Network:"), e.g. `http://192.168.1.20:8080`.
4. Upload, then open Serial Monitor at 115200.

NeoPixel: **blue** connecting · **green** all fine · **amber** check needed · **red** Wi-Fi or server error.

## Calibrate

Run `moisture_bench_test` (or watch `raw=…` from `incontinence_sensor`). Note the value with the probe
**dry in air** and **soaked** in salty water (closer to urine than tap water), then set
these on the server (`.env`) and restart:

```
SENSOR_DRY_RAW=3200   # higher = drier
SENSOR_WET_RAW=1300
```

Detection is tuned with `SENSOR_WET_ON_PCT` (default 35), `SENSOR_WET_OFF_PCT` (15) and
`SENSOR_CONFIRM_READINGS` (2, so a check is flagged after about 1 minute).

## Testing without the board

```bash
bun --env-file=.env scripts/simulate-sensor.ts
```

## Known limits / next steps

- **Battery life:** Wi-Fi stays connected between readings, which drains 3×AA in roughly
  a day. Use deep sleep between readings (`esp_deep_sleep`) before real use.
- **TLS:** `setInsecure()` is used for `https://` URLs. Pin the server's root CA.
- **Battery %** assumes 3×AA (4.5 V full, 3.3 V empty) and reports nothing on USB power.
