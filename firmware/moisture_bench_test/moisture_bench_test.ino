// Off-body bench test for an external 3.3V resistive moisture sensor.
// P1 wiring: VCC -> 3.3V, GND -> GND, AO -> IO0. DO is unused.
// Raw readings are not moisture percentages or a medical measurement.
#include <Arduino.h>

const uint8_t MOISTURE_PIN = P1_IO0;
unsigned long lastSample = 0;
unsigned long lastReport = 0;
uint32_t sampleSum = 0;
uint16_t sampleCount = 0;

void setup() {
  Serial.begin(115200);
  pinMode(MOISTURE_PIN, INPUT);
  analogReadResolution(12);
  Serial.println("Moisture bench test ready. P1 IO0 = AO; power sensor from 3.3V only.");
  Serial.println("Off-body test only. Compare dry and damp readings; no alert threshold set yet.");
}

void loop() {
  const unsigned long now = millis();
  if (now - lastSample >= 20) {
    lastSample = now;
    sampleSum += analogRead(MOISTURE_PIN);
    ++sampleCount;
  }
  if (now - lastReport >= 1000 && sampleCount > 0) {
    lastReport = now;
    Serial.print("MOISTURE_RAW:");
    Serial.print(sampleSum / sampleCount);
    Serial.println(" (0-4095, not percent)");
    sampleSum = 0;
    sampleCount = 0;
  }
  delay(1);
}
