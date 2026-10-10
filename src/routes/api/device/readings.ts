import { createFileRoute } from "@tanstack/react-router";
import { checkDeviceToken, getSensorStore } from "@/lib/sensor/store.server";
import { ingestSchema } from "@/lib/sensor/types";

// Ingest endpoint for the Axiometa Genesis Mini firmware (see firmware/).
//   POST /api/device/readings
//   Authorization: Bearer <DEVICE_TOKEN>
//   { "deviceId": "genesis-01", "raw": 2875, "batteryPct": 81, "rssi": -58, "firmware": "0.1.0" }
export const Route = createFileRoute("/api/device/readings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = checkDeviceToken(request);
        if (auth === "unconfigured")
          return Response.json({ error: "DEVICE_TOKEN is not set on the server" }, { status: 503 });
        if (auth === "denied") return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => null);
        const parsed = ingestSchema.safeParse(body);
        if (!parsed.success)
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });

        const status = await getSensorStore().ingest(parsed.data.deviceId, parsed.data);
        // Echo back the state so the board can show it on its NeoPixel.
        return Response.json({
          ok: true,
          needsCheck: status.needsCheck,
          moisturePct: status.moisturePct,
        });
      },
    },
  },
});
