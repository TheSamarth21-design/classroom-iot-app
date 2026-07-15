/*
 * Classroom IoT Control — ESP32 Firmware
 * 
 * This firmware connects to Blynk 2.0 Cloud and dynamically routes virtual pin commands
 * to physical GPIO relay pins using the catch-all BLYNK_WRITE_DEFAULT() callback.
 * 
 * Hardware configuration:
 * - Microcontroller: ESP32 or NodeMCU
 * - Actuators: 4/8 Channel Relay Module (Active LOW or Active HIGH)
 */

#define BLYNK_TEMPLATE_ID   "YOUR_TEMPLATE_ID"
#define BLYNK_TEMPLATE_NAME "YOUR_TEMPLATE_NAME"

// In production, the Auth Token is fetched from our Firestore database per classroom, 
// and flashed to the specific device.
#define BLYNK_AUTH_TOKEN    "YOUR_CLASSROOM_BLYNK_AUTH_TOKEN"

#define BLYNK_PRINT Serial

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>

// WiFi Credentials
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// GPIO pins assigned to relays (change these to match your physical wiring)
// Here, we map index 0 -> Relay 1 (V1), index 1 -> Relay 2 (V2), etc.
const int RELAY_PINS[] = {12, 14, 27, 26, 25, 33, 32, 4}; 
const int NUM_RELAYS = sizeof(RELAY_PINS) / sizeof(RELAY_PINS[0]);

// Set to true if your relay board is Active LOW (common for optocoupler relays)
// Set to false if your relay board is Active HIGH
const bool IS_ACTIVE_LOW = true;

void setup() {
  Serial.begin(115200);

  // Initialize physical relay pins as outputs and turn them OFF on boot
  for (int i = 0; i < NUM_RELAYS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], IS_ACTIVE_LOW ? HIGH : LOW); // Default to OFF state
  }

  Serial.println("Connecting to Blynk...");
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
}

void loop() {
  Blynk.run();
}

/**
 * Blynk Catch-All Callback: Handles any incoming virtual pin command dynamically.
 * Eliminates the need to write hardcoded BLYNK_WRITE(V1), BLYNK_WRITE(V2), etc.
 */
BLYNK_WRITE_DEFAULT() {
  // request.pin contains the integer of the Virtual Pin (e.g. 1 for V1, 5 for V5)
  int pinNum = request.pin;
  int value = param.asInt(); // 1 (ON) or 0 (OFF)

  Serial.print("Incoming Blynk Command: Virtual Pin V");
  Serial.print(pinNum);
  Serial.print(" -> Value: ");
  Serial.println(value);

  // Map Virtual Pin number (1-indexed: V1, V2, V3...) to our Relay array (0-indexed)
  int relayIndex = pinNum - 1;

  if (relayIndex >= 0 && relayIndex < NUM_RELAYS) {
    int targetGpio = RELAY_PINS[relayIndex];
    
    // Determine the raw signal to write to the GPIO relay pin
    int rawSignal;
    if (IS_ACTIVE_LOW) {
      rawSignal = (value == 1) ? LOW : HIGH; // Low triggers Active LOW relay
    } else {
      rawSignal = (value == 1) ? HIGH : LOW; // High triggers Active HIGH relay
    }
    
    digitalWrite(targetGpio, rawSignal);
    
    Serial.print("Mapped V");
    Serial.print(pinNum);
    Serial.print(" dynamically to GPIO ");
    Serial.print(targetGpio);
    Serial.print(" (Signal: ");
    Serial.print(rawSignal);
    Serial.println(")");
  } else {
    Serial.print("Warning: Received pin V");
    Serial.print(pinNum);
    Serial.println(" which is out of physical GPIO mapping range!");
  }
}

/**
 * Synchronize hardware state with Blynk Cloud values on reconnection.
 */
BLYNK_CONNECTED() {
  Serial.println("Connected to Blynk! Syncing pins...");
  // Request update for all virtual pins
  Blynk.syncAll();
}
