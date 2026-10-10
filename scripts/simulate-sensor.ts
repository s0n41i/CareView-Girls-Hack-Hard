// Pretends to be the Genesis Mini so the backend and UI can be tested without hardware.
//   DEVICE_TOKEN=... bun scripts/simulate-sensor.ts [baseUrl]
// Cycles dry -> wet -> changed, posting every 3 s.
const base = process.argv[2] ?? "http://localhost:8080";
const token = process.env.DEVICE_TOKEN;
if (!token) throw new Error("Set DEVICE_TOKEN");

const script = [3150, 3100, 3120, 2200, 1900, 1800, 1850, 1900, 2000, 3050, 3150, 3180];
for (let i = 0; ; i = (i + 1) % script.length) {
  const raw = script[i] + Math.round(Math.random() * 40 - 20);
  const res = await fetch(`${base}/api/device/readings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ deviceId: "sim-01", raw, batteryPct: 81, rssi: -58, firmware: "sim" }),
  });
  console.log(raw, res.status, await res.text());
  await new Promise((r) => setTimeout(r, 3000));
}
