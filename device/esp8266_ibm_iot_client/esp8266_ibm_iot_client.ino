/*
IBM IOT Foundation Quickstart for ESP8266
More info at https://github.com/watson-developer-cloud/stt-iot-disrupt-2015
*/

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

const char* ssid = "<YOUR WIFI SSID>";
const char* wifi_password = "<YOUR WIFI PASSWORD>";

// for the quickstart server, a lot of this can be null or just "quickstart"
// for a private instance, create an IoT service instance in Iluemix, bind to an app, click show credentials
const char* username = null; // Set to null for Quickstart or "use-token-auth" for token authentication
const char* password = null; // optional. Token goes here for token auth.
const char* client_id = "d:<YOUR ORG ID OR quickstart>:esp8266:<YOUR DEVICE'S MAC ADDRESS>"; // change second part to orgId and last part to mac address - WiFi.macAddress() but without the colons
const char* mqtt_server = "<YOUR ORG ID OR quickstart>.messaging.internetofthings.ibmcloud.com";


WiFiClient espClient;
PubSubClient client(espClient);
long lastMsg = 0;
char msg[50];
int value = 0;

void setup() {
  pinMode(BUILTIN_LED, OUTPUT);     // Initialize the BUILTIN_LED pin as an output - this may not exist on some ESP8266 devices, so change if necessary
  Serial.begin(115200);
  setup_wifi();
  Serial.print("server: "); Serial.println(mqtt_server);
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}



void setup_wifi() {

  delay(10);
  // We start by connecting to a WiFi network
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, wifi_password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  // Switch on the LED if an 1 was received as first character
  if ((char)payload[0] == '1') {
    digitalWrite(BUILTIN_LED, HIGH);   // Note: LED is active-low on some boards
  } else {
    digitalWrite(BUILTIN_LED, LOW); 
  }

}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    // Attempt to connect
    if (client.connect(client_id, username, password)) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      client.publish("iot-2/evt/status/fmt/json", "{\"d\": {\"data\":1}}");
      // ... and resubscribe
      client.subscribe("iot-2/cmd/led/fmt/text");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state()); 
      Serial.print(" (see http://knolleary.github.io/pubsubclient/api.html#state) ");
      Serial.println(" Retrying in 5 seconds...");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}
void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  long now = millis();
  if (now - lastMsg > 10000) {
    lastMsg = now;
    ++value;
    snprintf (msg, 75,"{\"d\": {\"data\":%ld}}", value);
    Serial.print("Publish message: ");
    Serial.println(msg);
    client.publish("iot-2/evt/status/fmt/json", msg);
  }
}
