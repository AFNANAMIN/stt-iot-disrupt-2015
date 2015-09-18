# Speech to Text & IoT

This webapp connects listens to your spoken words and converts them to text via the IBM Watson Speech to Text service. 
It processes the text for comands to turn the LED on or off and then sends those commands to a Node Red instance via JSONp.
The Node Red instance then forwards the command to an EXP8266 device through the IBM Iot Cloud (via the MQTT Protocol).

There is also a light-weight node.js server to convert your private Watson STT credentials to one-time-use API tokens that can be shared publicly.
