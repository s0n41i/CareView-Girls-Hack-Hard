# Remix of Attentive Care Monitor

List of alert cards, newest first, each with an icon, a discreet message (for example "Check needed", "Low intake by 2 pm", "Device offline", "Low battery"), a time, and two buttons: "Done" and "Snooze 1 hr".

Filter chips: All, Urgent, Devices.

Screen 3: History

Toggle: Day, Week, Month.

Bar chart of daily intake with a dashed target line.

Below it, a row of dots showing sensor events per day.

"Share report" button.

Screen 4: Settings

List rows: Patient, Alerts, Devices, Carers, Privacy, Help.

Extra: Link the tabs so the prototype is clickable. Use discreet, dignified wording throughout, with no explicit terms on any alert text.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2239b152-b60d-4a5a-9590-233a051fdb6c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Sensor backend

The underwear sensor (Axiometa Genesis Mini + soil hygrometer) posts readings to
`POST /api/device/readings`; the app reads `GET /api/sensor/status`. Firmware, wiring
and calibration are in [`firmware/README.md`](firmware/README.md).

```sh
cp .env.example .env   # set DEVICE_TOKEN (openssl rand -hex 24)
bun run dev
bun --env-file=.env scripts/simulate-sensor.ts   # fake device, no hardware needed
```

Readings are held in memory (`src/lib/sensor/store.server.ts`), so they reset on restart
and won't persist on serverless hosting. Swap in a database before deploying.
