/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var utils = require('./token');
var Microphone = require('./Microphone');
var eventbus = require('./eventbus.js'); // todo: make this thing just emit it's own events instead of using a shared bus

// Mini WS callback API, so we can initialize
// with model and token in URI, plus
// start message

// Initialize closure, which holds maximum getToken call count
var tokenGenerator = utils.createTokenGenerator();

exports.initSocket = function initSocket(options, onopen, onlistening, onmessage, onerror, onclose) {
  var listening;
  var socket;
  var token = options.token;
  var model = options.model || 'en-US_BroadbandModel';
  var startMessage = options.message || {'action': 'start'};
  var url = options.serviceURI || 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?'
    + 'model=' + model
    + '&X-WDC-PL-OPT-OUT=0'
    + '&watson-token=' + token;
  console.log('WS URL', url);
  try {
    socket = new WebSocket(url);
  } catch(err) {
    console.error('WS connection error: ', err);
  }
  socket.onopen = function(evt) {
    console.log("WS onopen", evt);
    listening = false;
    eventbus.subscribe('hardsocketstop', function() {
      console.log('MICROPHONE: close.');
      socket.send(JSON.stringify({action:'stop'}));
    });
    eventbus.subscribe('socketstop', function() {
      console.log('MICROPHONE: close.');
      socket.close();
    });
    socket.send(JSON.stringify(startMessage));
    onopen(socket);
  };
  socket.onmessage = function(evt) {
    console.log("WS onmessage", evt);
    var msg = JSON.parse(evt.data);
    if (msg.error) {
      showError(msg.error);
      eventbus.publish('hardsocketstop');
      return;
    }
    if (msg.state === 'listening') {
      // Early cut off, without notification
      if (!listening) {
        onlistening(socket);
        listening = true;
      } else {
        console.log('MICROPHONE: Closing socket.');
        socket.close();
      }
    }
    onmessage(msg, socket);
  };

  socket.onerror = function(evt) {
    console.log('WS onerror: ', evt);
    onerror(evt);
  };

  socket.onclose = function(evt) {
    console.log('WS onclose: ', evt);
    console.log(new Error('stack').stack);
    if (evt.code === 1006) {
      // Authentication error, try to reconnect
      tokenGenerator.getSttToken(function(token, err) {
        if (err) {
          eventbus.publish('hardsocketstop');
          return false;
        }
        options.token = token;
        initSocket(options, onopen, onlistening, onmessage, onerror, onclose);
      });
      return false;
    }
    if (evt.code === 1011) {
      console.error('Server error ' + evt.code + ': please refresh your browser and try again');
      return false;
    }
    if (evt.code > 1000) {
      console.error('Server error ' + evt.code + ': please refresh your browser and try again');
      return false;
    }
    // Made it through, normal close
    eventbus.unsubscribe('hardsocketstop');
    eventbus.unsubscribe('socketstop');
    onclose(evt);
  };

};
