// Copy to secrets.h (git-ignored) and fill in.
#pragma once

#define WIFI_SSID "your-wifi"
#define WIFI_PASSWORD "your-wifi-password"

// Where the CareView app runs. For local dev use your computer's LAN IP, not
// localhost, e.g. "http://192.168.1.20:8080". No trailing slash.
#define API_BASE_URL "http://192.168.1.20:8080"

// Must match DEVICE_TOKEN on the server.
#define DEVICE_TOKEN "change-me"

// Leave empty to derive one from the board's MAC address.
#define DEVICE_ID ""
