// CareView underwear sensor: Axiometa Genesis Mini (ESP32-S3) + soil hygrometer.
//
// Reads the probe every READ_INTERVAL_MS and POSTs the raw ADC value to the
// CareView backend (/api/device/readings). The backend does calibration and
// wet/changed detection, so thresholds can be tuned without reflashing.
//
// Board: "Axiometa Genesis Mini" (esp32 by Espressif Systems, core 3.x).
// Wiring (Port 1 on the Genesis Mini):
//   hygrometer AO  -> P1_IO0 (GPIO4, ADC1, safe to use with Wi-Fi)
//   hygrometer VCC -> 3.3V (same as moisture_bench_test)
//   hygrometer GND -> GND
//   DO unused. Optionally move VCC to P1_IO1 and set PROBE_POWER_PIN below.
//
// Copy secrets.example.h to secrets.h and fill it in before building.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "secrets.h"

#define FIRMWARE_VERSION "0.1.0"

const int PROBE_AO_PIN = P1_IO0;
// -1: probe VCC wired to 3.3V. Set to P1_IO1 (GPIO3) if VCC is moved there, so the
// probe is powered only while reading (slows corrosion of a resistive fork).
const int PROBE_POWER_PIN = -1;

const uint32_t READ_INTERVAL_MS = 30000;  // backend marks the device offline after 90 s
const int SAMPLES = 16;

// 3x AA: ~4.5 V fresh, ~3.3 V flat. BAT_SENSE sits behind a /2 divider.
const float BATTERY_FULL_V = 4.5f;
const float BATTERY_EMPTY_V = 3.3f;

String deviceId;

void setLed(uint8_t r, uint8_t g, uint8_t b) {
  rgbLedWrite(RGB_LED, r / 8, g / 8, b / 8);  // dimmed: it's at the bedside
}

int readProbeRaw() {
  if (PROBE_POWER_PIN >= 0) {
    digitalWrite(PROBE_POWER_PIN, HIGH);
    delay(20);  // let the module's output settle
  }
  uint32_t sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(PROBE_AO_PIN);
    delay(2);
  }
  // Powering the probe only while reading slows electrolytic corrosion of the
  // resistive fork, which is much faster in urine than in soil.
  if (PROBE_POWER_PIN >= 0) digitalWrite(PROBE_POWER_PIN, LOW);
  return sum / SAMPLES;
}

// Returns -1 when no battery is detected (e.g. running from USB).
int readBatteryPct() {
  float v = analogReadMilliVolts(BAT_SENSE) * 2.0f / 1000.0f;
  if (v < 1.0f) return -1;
  float pct = (v - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V) * 100.0f;
  return constrain((int)pct, 0, 100);
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  setLed(0, 0, 255);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi: not connected");
    return false;
  }
  Serial.printf("Wi-Fi: connected, IP %s\n", WiFi.localIP().toString().c_str());
  return true;
}

// Returns the HTTP status (or a negative HTTPClient error). Sets needsCheck from the reply.
int postReading(int raw, int batteryPct, bool &needsCheck) {
  String url = String(API_BASE_URL) + "/api/device/readings";
  HTTPClient http;
  WiFiClientSecure tls;
  WiFiClient plain;
  if (url.startsWith("https://")) {
    // TODO before deployment: replace setInsecure() with tls.setCACert(<root CA>)
    // so the token can't be intercepted by a spoofed server.
    tls.setInsecure();
    http.begin(tls, url);
  } else {
    http.begin(plain, url);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.setTimeout(10000);

  String body = "{\"deviceId\":\"" + deviceId + "\",\"raw\":" + raw + ",\"rssi\":" + WiFi.RSSI() +
                ",\"firmware\":\"" FIRMWARE_VERSION "\"";
  if (batteryPct >= 0) body += ",\"batteryPct\":" + String(batteryPct);
  body += "}";

  int code = http.POST(body);
  if (code == 200) needsCheck = http.getString().indexOf("\"needsCheck\":true") >= 0;
  else Serial.printf("POST failed: %d %s\n", code, code > 0 ? http.getString().c_str() : http.errorToString(code).c_str());
  http.end();
  return code;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(PROBE_AO_PIN, ADC_11db);  // full 0-3.1 V range
  if (PROBE_POWER_PIN >= 0) {
    pinMode(PROBE_POWER_PIN, OUTPUT);
    digitalWrite(PROBE_POWER_PIN, LOW);
  }
  setLed(0, 0, 255);

  WiFi.mode(WIFI_STA);
  if (strlen(DEVICE_ID) > 0) {
    deviceId = DEVICE_ID;
  } else {
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    deviceId = "genesis-" + mac.substring(6);
  }
  Serial.printf("CareView sensor %s, firmware %s\n", deviceId.c_str(), FIRMWARE_VERSION);
}

void loop() {
  int raw = readProbeRaw();
  int battery = readBatteryPct();
  // Watch this line in the Serial Monitor to calibrate: note raw when dry and when soaked.
  Serial.printf("raw=%d battery=%d%%\n", raw, battery);

  if (ensureWifi()) {
    bool needsCheck = false;
    int code = postReading(raw, battery, needsCheck);
    if (code == 200) needsCheck ? setLed(255, 140, 0) : setLed(0, 255, 0);
    else setLed(255, 0, 0);
  } else {
    setLed(255, 0, 0);
  }
  delay(READ_INTERVAL_MS);
}
