# CareView

Sensing underwear and a reusable clip that quietly tells a carer when a change is needed.
Off-body prototype on an Axiometa Genesis Mini. Not a medical device.

## What's here

| Path | What it is |
| --- | --- |
| `index.html`, `scene.js`, `img/` | The product site, with a live 3D view of the prototype and an exploded view of the clip |
| `firmware/caregiver_sms/` | The sketch: reads the moisture sensor, alerts after 10 s wet, texts the carer (simulated or via Twilio) |
| `firmware/moisture_bench_test/` | Bench test: prints raw readings, for wiring checks and calibration |

## Hardware

Axiometa Genesis Mini (ESP32-S3) + resistive soil hygrometer module, Port 1:

- VCC → 3.3V, GND → GND, AO → IO0 (`P1_IO0`). DO unused.

Board: **Axiometa Genesis Mini** (esp32 by Espressif Systems, 3.3.8 or newer), or upload through the Axiometa web tool.

## Run the site with the real board

The 3D prototype view reads the board over USB (Web Serial), so it needs Chrome or Edge and a local or HTTPS server:

```sh
python3 -m http.server 8765
```

Open http://localhost:8765, close any other serial monitor, and press **Connect my board**.

## Sketch settings

At the top of `firmware/caregiver_sms/caregiver_sms.ino`:

- `SIMULATE_SMS true` prints texts to Serial (free). Set `false` and fill in Wi-Fi and Twilio details to send real texts. Don't commit real credentials.
- `WET_BELOW` / `DRY_ABOVE`: thresholds on the raw reading (dry ≈ 4000, lower is wetter).
- `ALERT_AFTER_MS`, `REMINDER_EVERY_MS`, `MIN_MS_BETWEEN_SMS`: timing and cost guard.

Serial output (115200 baud): `MOISTURE_RAW:<n>`, `WET_STATE:TIMING|DRY`, `CAREGIVER_ALERT:<msg>`, `SMS_SIMULATED:<text>` / `SMS_SENT:<text>`, `BATTERY:<pct>`. Send `t` for a test text.
