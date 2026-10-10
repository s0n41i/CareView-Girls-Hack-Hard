import { createFileRoute } from "@tanstack/react-router";
import { getSensorStore } from "@/lib/sensor/store.server";

// Read endpoint for the app: GET /api/sensor/status → DeviceStatus[]
// No auth yet: add carer sign-in before this holds real patient data.
export const Route = createFileRoute("/api/sensor/status")({
  server: {
    handlers: {
      GET: async () => {
        const devices = await getSensorStore().listDevices();
        return Response.json(devices, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
