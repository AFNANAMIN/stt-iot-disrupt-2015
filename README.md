# stt-iot-disrupt-2015
Slides and code from the Speech to Text & IoT talk at TechCrunch's 2015 Disrupt SF Hackathon

## Setting up the demo

There are a few different moving parts in this demo: 
* The device itself
* A Bluemix server instance to host Node-RED and connect the IBM IoT service
* A second Bluemix server instance to host the website and connect the Speech to Text service

### The Device

I'm using a [SparkFun ESP8266 Thing](https://www.sparkfun.com/products/13231) and the Arduino programing environment, 
but anything that can speak the MQTT protocol will do - the IBM Iot Foundation has 
["Recpipes" for connecting dozens of other devices](https://developer.ibm.com/recipes/).

For the ESP8266 Thing, follow [SparkFun's hookup guide](https://learn.sparkfun.com/tutorials/esp8266-thing-hookup-guide)
to get it assembled and set up the Arduino software, then install the [PubSubClient](http://knolleary.github.io/pubsubclient/) 
in the Library Manager, and upload the sketch.

To just see something working quickly, most of the settings can be null or "quickstart", and then enter the device's MAC address at https://quickstart.internetofthings.ibmcloud.com/#/
 - The rest of the settings will come from the Node-RED bluemix instance.

### Node-RED

Create a [Bluemix](https://bluemix.net/) account and server instance from the [IoT Foundation Starter Boilerplate](https://www.ng.bluemix.net/docs/?cm_mmc=developerWorks-_-dWdevcenter-_-remix-_-lp#starters/IoT/iot500.html#iot600),
then create an instance of the [IoT Service](https://www.ng.bluemix.net/docs/?cm_mmc=developerWorks-_-dWdevcenter-_-remix-_-lp#services/IoT/index.html#gettingstartedtemplate) and bind it to the Node-RED server.

On your Node-RED server's dashboard, find the new IoT service instance and click **Show credentials** - this will give you the Org ID to enter into the `client_id` and `mqtt_server` variables in the Arduino sketch.

Now launch the IoT Foundation Service Dashboard, create a new device type `esp8266` (all other fields are optional), and then create one `esp8266` device. 
Set the `username` and `password` in the Arduino sketch to `"use-token-auth"` and the token for the new device.

Upload your updated sketch to the device and the entry for your new device should start receiving status messages within a few seconds.

Finally, log into your node-red server (the link should be available in the Bluemix Dashboard), 
import the data from `node-red/nodes.json` (top-right hamburger menu), 
and update the two IBM IoT nodes to have your devices MAC address for the ID (double-click to update).

### Website and Speech to Text service

Edit the two `req = $.getJSON(...` lines in `web/src/handlemicrophone.js` to change to domain name to your Node-RED instance. 
Then run:

  npm install
  npm build
  
(This step requires [node.js](nodejs.org/).)

Next install the [`cf` command line tool](https://github.com/cloudfoundry/cli/releases), and then in the `web/` folder, run:

    cf login
    cf push
    
This should create a new Bluemix server instance, bind a new Speech to Text instance, and publish the demo web app. 

That's it! Try out your demo app and then build on it to create something even cooler!
