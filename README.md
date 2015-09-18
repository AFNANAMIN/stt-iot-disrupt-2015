# stt-iot-disrupt-2015
Slides and code from the Speech to Text &amp; IoT talk at TechCrunch's 2015 Disrupt SF Hackathon

## Setting up the demo

There are a few different moving parts in this demo: 
* The device itself
* A Bluemix server instance to host the website and connect the Speech to Text service
* A second Bluemix server instance to host Node-RED and connect the IBM IoT service

### The Device

I'm using a [SparkFun ESP8266 Thing](https://www.sparkfun.com/products/13231) and the Arduino programing environment, 
but anything that can speak the MQTT protocol will do - the IBM Iot Foundation has 
["Recpipes" for connecting dozens of other devices](https://developer.ibm.com/recipes/).

For the ESP8266 Thing, follow [SparkFun's hookup guide](https://learn.sparkfun.com/tutorials/esp8266-thing-hookup-guide)
to get it assembled and set up the Arduino software, then install the [PubSubClient](http://knolleary.github.io/pubsubclient/) 
in the Library Manager, and upload the sketch.

### Website and Speech to Text service

Todo

### Node-RED

Todo
