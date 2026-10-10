# Sensor details, settings and setup flow

## History screen
- Change the sensor dot row under the intake chart so each day shows amber dots for wet and red dots for soiled, with a small legend below it ("Wet" in amber, "Soiled" in red).
- Add a rounded card below the chart: "Average time to change: 18 min".

## Settings screen
- Tapping a row now opens it in place, instead of doing nothing.
- **Devices:** add an "Underwear sensor" card showing battery (e.g. 78%), signal strength (bars plus "Good"), and a "Pair new sensor" button that opens the setup flow.
- **Alerts:** add a toggle "Sensor alerts at night" (on by default) and a "Reminder after" choice of 10, 20 or 30 min.

## Setup flow (new)
- The prototype has no setup flow yet, so this adds a short step-by-step one, opened from "Pair new sensor":
  1. Welcome
  2. Place the drink coaster
  3. Scan the sensor QR code (camera frame with a "Simulate scan" button)
  4. All set (button back to Settings)
- Back and Next buttons on each step, plus a step indicator.

## Alerts screen
- "Done" and "Snooze 1 hr" already remove the card. In addition:
  - Snoozed alerts move to a "Snoozed" section with an "Undo" button.
  - Tapping the alert card opens a short detail view with the same two buttons.

## Style
- Keep the current style: green, amber and red colours, large text, rounded cards, and the 4-tab bar on every main screen. The setup flow is full-screen with a close button.
- Elsewhere, alert text stays discreet. "Wet" and "Soiled" appear only in the History legend, as requested.

## Technical details
- New route `src/routes/setup.tsx` with step state; History dots get typed data (`{wet, soiled}` per day).
- Settings expandable rows built from local state; toggle uses the existing switch component, and the reminder choice uses segmented buttons.
- Alerts snoozed list held in local state.
