/*
 Basic ESP8266 MQTT example

 This sketch demonstrates the capabilities of the pubsub library in combination
 with the ESP8266 board/library.

 It connects to an MQTT server then:
  - publishes "hello world" to the topic "outTopic" every two seconds
  - subscribes to the topic "inTopic", printing out any messages
    it receives. NB - it assumes the received payloads are strings not binary
  - If the first character of the topic "inTopic" is an 1, switch ON the ESP Led,
    else switch it off

 It will reconnect to the server if the connection is lost using a blocking
 reconnect function. See the 'mqtt_reconnect_nonblocking' example for how to
 achieve the same result without blocking the main loop.

 To install the ESP8266 board, (using Arduino 1.6.4+):
  - Add the following 3rd party board manager under "File -> Preferences -> Additional Boards Manager URLs":
       http://arduino.esp8266.com/stable/package_esp8266com_index.json
  - Open the "Tools -> Board -> Board Manager" and click install for the ESP8266"
  - Select your ESP8266 in "Tools -> Board"

*/

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// Update these with values suitable for your network.

const char* ssid = "Friedly";
const char* wifi_password = "1234554321";

const char* username = "use-token-auth"; // optional. Set to "use-token-auth" for token authentication
const char* password = "w4E+mos+RI)Xo5z45x"; // optional. Token goes here for token auth.
const char* clientId = "d:6b4nht:esp8266:18FE34EF211C"; // Device ID. change second part to orgId and last part to mac address - WiFi.macAddress() but without the colons 
const char* mqtt_server = "6b4nht.messaging.internetofthings.ibmcloud.com"; // create a service instance in bluemix, bind to an aopp, click show credentials


WiFiClient espClient;
PubSubClient client(espClient);
long lastMsg = 0;
char msg[50];
int value = 0;

void setup() {
  pinMode(BUILTIN_LED, OUTPUT);     // Initialize the BUILTIN_LED pin as an output
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
    if (client.connect(clientId, username, password)) {
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
