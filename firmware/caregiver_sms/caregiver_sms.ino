// Caregiver alert: external 3.3V resistive moisture sensor on the Axiometa Genesis Mini.
// P1 wiring: VCC -> 3.3V, GND -> GND, AO -> IO0. DO is unused.
// Off-body prototype. Raw readings are not moisture percentages or a medical measurement.
//
// SIMULATE_SMS true  : texts are printed to Serial, where the CareView site (index.html)
//                      shows them on its phone. Free.
// SIMULATE_SMS false : texts are sent through Twilio over Wi-Fi (fill in the settings below).
//
// Serial output (115200) is what the site reads over USB:
//   MOISTURE_RAW:<n>  WET_STATE:TIMING|DRY  CAREGIVER_ALERT:<msg>  SMS_SIMULATED|SMS_SENT:<text>  BATTERY:<pct>
// Serial command: t = send a test text.
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#define SIMULATE_SMS true

// Only needed when SIMULATE_SMS is false. Don't share this file once filled in.
#define CAREGIVER_PHONE "+15551234567"  // caregiver's mobile, international format
#define WIFI_SSID "your-wifi"
#define WIFI_PASSWORD "your-wifi-password"
#define TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
#define TWILIO_AUTH_TOKEN "your-auth-token"
#define TWILIO_FROM_NUMBER "+15557654321"  // your Twilio number

// ---------- Settings ----------
const char *PERSON_NAME = "Margaret";
const int WET_BELOW = 2500;                         // smoothed reading below this = wet
const int DRY_ABOVE = 2700;                         // must rise past this to count as dry again
const unsigned long ALERT_AFTER_MS = 10000UL;       // wet this long before the first text
const unsigned long REMINDER_EVERY_MS = 300000UL;   // text again every 5 min while still wet
const int MAX_REMINDERS = 2;
const bool SEND_ALL_CLEAR = true;                   // text once it reads dry after an alert
const int LOW_BATTERY_PCT = 15;
const unsigned long MIN_MS_BETWEEN_SMS = 30000UL;   // cost guard, whatever the sensor does
// ------------------------------

const uint8_t MOISTURE_PIN = P1_IO0;

enum State { DRY, TIMING, ALERTED };
State state = DRY;
float smoothed = -1;
unsigned long wetSince = 0;
unsigned long lastAlertAt = 0;
int remindersSent = 0;
bool lowBatterySent = false;
unsigned long lastSample = 0;
unsigned long lastReport = 0;
unsigned long lastBatteryCheck = 0;
unsigned long lastSmsAt = 0;
bool anySmsSent = false;

// ---------- Outputs ----------
void setLed(uint8_t r, uint8_t g, uint8_t b) { rgbLedWrite(RGB_LED, r / 8, g / 8, b / 8); }

void showState() {
  if (state == ALERTED) setLed(255, 0, 0);        // red: caregiver alerted
  else if (state == TIMING) setLed(255, 140, 0);  // amber: wet, timing
  else setLed(0, 255, 0);                         // green: dry
}

String urlEncode(const String &s) {
  String out;
  const char *hex = "0123456789ABCDEF";
  for (char c : s) {
    if (isalnum((unsigned char)c) || c == '-' || c == '_' || c == '.' || c == '~') {
      out += c;
    } else {
      out += '%';
      out += hex[(c >> 4) & 0xF];
      out += hex[c & 0xF];
    }
  }
  return out;
}

bool sendTwilio(const String &message) {
  setLed(0, 0, 255);  // blue while sending
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 60 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  bool ok = false;
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("SMS_ERROR:Wi-Fi not connected");
  } else {
    WiFiClientSecure tls;
    tls.setInsecure();  // TODO before real use: tls.setCACert(<Twilio root CA>)
    HTTPClient http;
    http.begin(tls, String("https://api.twilio.com/2010-04-01/Accounts/") + TWILIO_ACCOUNT_SID + "/Messages.json");
    http.setAuthorization(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    const int code = http.POST("To=" + urlEncode(CAREGIVER_PHONE) + "&From=" + urlEncode(TWILIO_FROM_NUMBER) +
                               "&Body=" + urlEncode(message));
    ok = code == 201;
    if (!ok) Serial.printf("SMS_ERROR:HTTP %d %s\n", code, code > 0 ? http.getString().c_str() : "");
    http.end();
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);  // radio off between texts saves battery
  showState();
  return ok;
}

// Every text goes through here. The simulator listens for the SMS_SIMULATED: line.
void sendCaregiverSms(const String &message) {
  const unsigned long now = millis();
  if (anySmsSent && now - lastSmsAt < MIN_MS_BETWEEN_SMS) {
    Serial.println("SMS_SKIPPED:rate limit (" + message + ")");
    return;
  }
  anySmsSent = true;
  lastSmsAt = now;
  if (SIMULATE_SMS) {
    Serial.println("SMS_SIMULATED:" + message);
  } else {
    Serial.println(sendTwilio(message) ? "SMS_SENT:" + message : "SMS_FAILED:" + message);
  }
}

// ---------- Inputs ----------
// Returns -1 when running on USB with no battery.
int readBatteryPct() {
  const float v = analogReadMilliVolts(BAT_SENSE) * 2.0f / 1000.0f;  // /2 divider on the board
  if (v < 1.0f) return -1;
  return constrain((int)((v - 3.3f) / (4.5f - 3.3f) * 100.0f), 0, 100);
}

void handleCommands() {
  while (Serial.available()) {
    const char c = Serial.read();
    if (c == 't') { anySmsSent = false; sendCaregiverSms("CareView: test message. Alerts are working."); }
  }
}

// ---------- Detection ----------
void updateState(unsigned long now) {
  const bool wet = smoothed < WET_BELOW;
  const bool dry = smoothed > DRY_ABOVE;

  if (state == DRY && wet) {
    state = TIMING;
    wetSince = now;
    Serial.println("WET_STATE:TIMING");
  } else if (state == TIMING && dry) {
    state = DRY;
    Serial.println("WET_STATE:DRY");
  } else if (state == TIMING && now - wetSince >= ALERT_AFTER_MS) {
    state = ALERTED;
    lastAlertAt = now;
    remindersSent = 0;
    Serial.printf("CAREGIVER_ALERT:Wet for %lu seconds.\n", ALERT_AFTER_MS / 1000);
    // Discreet wording: the text may show on a lock screen.
    sendCaregiverSms(String("CareView: ") + PERSON_NAME + " may need a check.");
  } else if (state == ALERTED && dry) {
    state = DRY;
    Serial.println("WET_STATE:DRY");
    if (SEND_ALL_CLEAR) sendCaregiverSms(String("CareView: all clear for ") + PERSON_NAME + ". Thank you.");
  } else if (state == ALERTED && remindersSent < MAX_REMINDERS && now - lastAlertAt >= REMINDER_EVERY_MS) {
    remindersSent++;
    lastAlertAt = now;
    const unsigned long mins = (now - wetSince) / 60000UL;
    sendCaregiverSms(String("CareView reminder: ") + PERSON_NAME + " may still need a check (" + mins + " min).");
  }
  showState();
}

void checkBattery(unsigned long now) {
  if (now - lastBatteryCheck < 60000UL && lastBatteryCheck != 0) return;
  lastBatteryCheck = now;
  const int pct = readBatteryPct();
  if (pct < 0) return;
  Serial.printf("BATTERY:%d\n", pct);
  if (pct <= LOW_BATTERY_PCT && !lowBatterySent) {
    lowBatterySent = true;
    sendCaregiverSms(String("CareView: sensor battery low (") + pct + "%). Please replace soon.");
  } else if (pct > LOW_BATTERY_PCT + 10) {
    lowBatterySent = false;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(MOISTURE_PIN, INPUT);
  analogReadResolution(12);
  WiFi.mode(WIFI_OFF);
  setLed(0, 255, 0);
  Serial.println("Caregiver alert ready. P1 IO0 = AO; power sensor from 3.3V only.");
  Serial.printf("Off-body prototype. Alert after %lu s below %d; %s.\n", ALERT_AFTER_MS / 1000, WET_BELOW,
                SIMULATE_SMS ? "texts are simulated" : "texts are sent via Twilio");
  Serial.println("Command: t = send a test text");
}

void loop() {
  const unsigned long now = millis();
  handleCommands();

  if (now - lastSample >= 20) {
    lastSample = now;
    const int reading = analogRead(MOISTURE_PIN);
    // Smooth over ~200 ms so one noisy sample can't start or reset the timer.
    smoothed = smoothed < 0 ? reading : smoothed * 0.9f + reading * 0.1f;
    updateState(now);
  }
  if (now - lastReport >= 1000) {
    lastReport = now;
    Serial.print("MOISTURE_RAW:");
    Serial.print((int)smoothed);
    Serial.println(" (0-4095, not percent)");
  }
  checkBattery(now);
  delay(1);
}
