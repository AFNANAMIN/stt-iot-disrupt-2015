(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var utils = require('./token');
/**
 * Captures microphone input from the browser.
 * Works at least on latest versions of Firefox and Chrome
 */
function Microphone(_options) {
  var options = _options || {};

  // we record in mono because the speech recognition service
  // does not support stereo.
  this.bufferSize = options.bufferSize || 8192;
  this.inputChannels = options.inputChannels || 1;
  this.outputChannels = options.outputChannels || 1;
  this.recording = false;
  this.requestedAccess = false;
  this.sampleRate = 16000;
  // auxiliar buffer to keep unused samples (used when doing downsampling)
  this.bufferUnusedSamples = new Float32Array(0);

  // Chrome or Firefox or IE User media
  if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia;
  }

}

/**
 * Called when the user reject the use of the michrophone
 * @param  error The error
 */
Microphone.prototype.onPermissionRejected = function() {
  console.log('Microphone.onPermissionRejected()');
  this.requestedAccess = false;
  this.onError('Permission to access the microphone rejeted.');
};

Microphone.prototype.onError = function(error) {
  console.log('Microphone.onError():', error);
};

/**
 * Called when the user authorizes the use of the microphone.
 * @param  {Object} stream The Stream to connect to
 *
 */
Microphone.prototype.onMediaStream =  function(stream) {
  var AudioCtx = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtx)
    throw new Error('AudioContext not available');

  if (!this.audioContext)
    this.audioContext = new AudioCtx();

  var gain = this.audioContext.createGain();
  var audioInput = this.audioContext.createMediaStreamSource(stream);

  audioInput.connect(gain);

  this.mic = this.audioContext.createScriptProcessor(this.bufferSize,
    this.inputChannels, this.outputChannels);

  // uncomment the following line if you want to use your microphone sample rate
  //this.sampleRate = this.audioContext.sampleRate;
  console.log('Microphone.onMediaStream(): sampling rate is:', this.sampleRate);

  this.mic.onaudioprocess = this._onaudioprocess.bind(this);
  this.stream = stream;

  gain.connect(this.mic);
  this.mic.connect(this.audioContext.destination);
  this.recording = true;
  this.requestedAccess = false;
  this.onStartRecording();
};

/**
 * callback that is being used by the microphone
 * to send audio chunks.
 * @param  {object} data audio
 */
Microphone.prototype._onaudioprocess = function(data) {
  if (!this.recording) {
    // We speak but we are not recording
    return;
  }

  // Single channel
  var chan = data.inputBuffer.getChannelData(0);  
  
  //resampler(this.audioContext.sampleRate,data.inputBuffer,this.onAudio);

  this.onAudio(this._exportDataBufferTo16Khz(new Float32Array(chan)));

  //export with microphone mhz, remember to update the this.sampleRate
  // with the sample rate from your microphone
  // this.onAudio(this._exportDataBuffer(new Float32Array(chan)));

};

/**
 * Start the audio recording
 */
Microphone.prototype.record = function() {
  if (!navigator.getUserMedia){
    this.onError('Browser doesn\'t support microphone input');
    return;
  }
  if (this.requestedAccess) {
    return;
  }

  this.requestedAccess = true;
  navigator.getUserMedia({ audio: true },
    this.onMediaStream.bind(this), // Microphone permission granted
    this.onPermissionRejected.bind(this)); // Microphone permission rejected
};

/**
 * Stop the audio recording
 */
Microphone.prototype.stop = function() {
  if (!this.recording)
    return;
  this.recording = false;
  this.stream.stop();
  this.requestedAccess = false;
  this.mic.disconnect(0);
  this.mic = null;
  this.onStopRecording();
};

/**
 * Creates a Blob type: 'audio/l16' with the chunk and downsampling to 16 kHz
 * coming from the microphone.
 * Explanation for the math: The raw values captured from the Web Audio API are
 * in 32-bit Floating Point, between -1 and 1 (per the specification).
 * The values for 16-bit PCM range between -32768 and +32767 (16-bit signed integer).
 * Multiply to control the volume of the output. We store in little endian.
 * @param  {Object} buffer Microphone audio chunk
 * @return {Blob} 'audio/l16' chunk
 * @deprecated This method is depracated
 */
Microphone.prototype._exportDataBufferTo16Khz = function(bufferNewSamples) {
  var buffer = null,
    newSamples = bufferNewSamples.length,
    unusedSamples = this.bufferUnusedSamples.length;   
    

  if (unusedSamples > 0) {
    buffer = new Float32Array(unusedSamples + newSamples);
    for (var i = 0; i < unusedSamples; ++i) {
      buffer[i] = this.bufferUnusedSamples[i];
    }
    for (i = 0; i < newSamples; ++i) {
      buffer[unusedSamples + i] = bufferNewSamples[i];
    }
  } else {
    buffer = bufferNewSamples;
  }

  // downsampling variables
  var filter = [
      -0.037935, -0.00089024, 0.040173, 0.019989, 0.0047792, -0.058675, -0.056487,
      -0.0040653, 0.14527, 0.26927, 0.33913, 0.26927, 0.14527, -0.0040653, -0.056487,
      -0.058675, 0.0047792, 0.019989, 0.040173, -0.00089024, -0.037935
    ],
    samplingRateRatio = this.audioContext.sampleRate / 16000,
    nOutputSamples = Math.floor((buffer.length - filter.length) / (samplingRateRatio)) + 1,
    pcmEncodedBuffer16k = new ArrayBuffer(nOutputSamples * 2),
    dataView16k = new DataView(pcmEncodedBuffer16k),
    index = 0,
    volume = 0x7FFF, //range from 0 to 0x7FFF to control the volume
    nOut = 0;

  for (var i = 0; i + filter.length - 1 < buffer.length; i = Math.round(samplingRateRatio * nOut)) {
    var sample = 0;
    for (var j = 0; j < filter.length; ++j) {
      sample += buffer[i + j] * filter[j];
    }
    sample *= volume;
    dataView16k.setInt16(index, sample, true); // 'true' -> means little endian
    index += 2;
    nOut++;
  }

  var indexSampleAfterLastUsed = Math.round(samplingRateRatio * nOut);
  var remaining = buffer.length - indexSampleAfterLastUsed;
  if (remaining > 0) {
    this.bufferUnusedSamples = new Float32Array(remaining);
    for (i = 0; i < remaining; ++i) {
      this.bufferUnusedSamples[i] = buffer[indexSampleAfterLastUsed + i];
    }
  } else {
    this.bufferUnusedSamples = new Float32Array(0);
  }

  return new Blob([dataView16k], {
    type: 'audio/l16'
  });
  };

  
  
// native way of resampling captured audio
var resampler = function(sampleRate, audioBuffer, callbackProcessAudio) {
	
	console.log("length: " + audioBuffer.length + " " + sampleRate);
	var channels = 1; 
	var targetSampleRate = 16000;
   var numSamplesTarget = audioBuffer.length * targetSampleRate / sampleRate;

   var offlineContext = new OfflineAudioContext(channels, numSamplesTarget, targetSampleRate);
   var bufferSource = offlineContext.createBufferSource();
   bufferSource.buffer = audioBuffer;

	// callback that is called when the resampling finishes
   offlineContext.oncomplete = function(event) {   	
      var samplesTarget = event.renderedBuffer.getChannelData(0);                                       
      console.log('Done resampling: ' + samplesTarget.length + " samples produced");  

		// convert from [-1,1] range of floating point numbers to [-32767,32767] range of integers
		var index = 0;
		var volume = 0x7FFF;
  		var pcmEncodedBuffer = new ArrayBuffer(samplesTarget.length*2);    // short integer to byte
  		var dataView = new DataView(pcmEncodedBuffer);
      for (var i = 0; i < samplesTarget.length; i++) {
    		dataView.setInt16(index, samplesTarget[i]*volume, true);
    		index += 2;
  		}

      // l16 is the MIME type for 16-bit PCM
      callbackProcessAudio(new Blob([dataView], { type: 'audio/l16' }));         
   };

   bufferSource.connect(offlineContext.destination);
   bufferSource.start(0);
   offlineContext.startRendering();   
};
 
  

/**
 * Creates a Blob type: 'audio/l16' with the
 * chunk coming from the microphone.
 */
var exportDataBuffer = function(buffer, bufferSize) {
  var pcmEncodedBuffer = null,
    dataView = null,
    index = 0,
    volume = 0x7FFF; //range from 0 to 0x7FFF to control the volume

  pcmEncodedBuffer = new ArrayBuffer(bufferSize * 2);
  dataView = new DataView(pcmEncodedBuffer);

  /* Explanation for the math: The raw values captured from the Web Audio API are
   * in 32-bit Floating Point, between -1 and 1 (per the specification).
   * The values for 16-bit PCM range between -32768 and +32767 (16-bit signed integer).
   * Multiply to control the volume of the output. We store in little endian.
   */
  for (var i = 0; i < buffer.length; i++) {
    dataView.setInt16(index, buffer[i] * volume, true);
    index += 2;
  }

  // l16 is the MIME type for 16-bit PCM
  return new Blob([dataView], { type: 'audio/l16' });
};

Microphone.prototype._exportDataBuffer = function(buffer){
  utils.exportDataBuffer(buffer, this.bufferSize);
}; 


// Functions used to control Microphone events listeners.
Microphone.prototype.onStartRecording =  function() {};
Microphone.prototype.onStopRecording =  function() {};
Microphone.prototype.onAudio =  function() {};

module.exports = Microphone;


},{"./token":7}],3:[function(require,module,exports){
'use strict';
var EventEmitter = require("events").EventEmitter;

var bus = new EventEmitter();

bus.subscribe = bus.on;
bus.unsubscribe = function(event, listener) {
    if (listener) {
        return bus.removeListener(event, listener)
    } else {
        return bus.removeAllListeners(event);
    }
};
bus.publish = bus.emit;

module.exports = bus;

},{"events":1}],4:[function(require,module,exports){

'use strict';

var initSocket = require('./socket').initSocket;
var lightbulb = require('./views/lightbulb.js');

exports.handleMicrophone = function(token, model, mic, callback) {

  var options = {};
  options.token = token;
  options.message = {
    'action': 'start',
    'content-type': 'audio/l16;rate=16000',
    'interim_results': true,
    'continuous': true,
    'word_confidence': true,
    'timestamps': true,
    'max_alternatives': 3,
    'inactivity_timeout': 600    
  };
  options.model = model;

  function onOpen(socket) {
    console.log('Mic socket: opened');
    callback(null, socket);
  }

  function onListening(socket) {

    mic.onAudio = function(blob) {
      if (socket.readyState < 2) {
        socket.send(blob)
      }
    };
  }


  // check all alternatives for a possible match against any of the expected permutations
  // return true as soon as one is found, or false if none is found
  function matches(alternatives, posibilities) {
    return alternatives.some(function(a) {
      return posibilities.some(function(p) {
        return a.transcript.indexOf(p) != -1;
      });
    });
  }


  var req;


  function onMessage(msg, socket) {
    console.log('Mic socket msg: ', msg);
    if (msg.results && msg.results[0].alternatives.length) {
      var result = msg.results[0];
      var alternatives = result.alternatives;
      if (matches(alternatives, ['on', 'own', 'olin', 'so'])) {
        lightbulb.on();
        req && req.abort();
        req = $.getJSON('http://watson-iot.mybluemix.net/led?on=true&callback=?', console.log);
      }
      else if (matches(alternatives, ['off'])) {
        lightbulb.off();
        req && req.abort();
        req = $.getJSON('http://watson-iot.mybluemix.net/led?on=false&callback=?', console.log);
      }

    }
  }

  function onError(err, socket) {
    console.log('Mic socket err: ', err);
  }

  function onClose(evt) {
    console.log('Mic socket close: ', evt);
  }

  initSocket(options, onOpen, onListening, onMessage, onError, onClose);

};

},{"./socket":6,"./views/lightbulb.js":8}],5:[function(require,module,exports){
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

'use strict';

var Microphone = require('./Microphone');
var Token = require('./token');
var initViews = require('./views/recordbutton').initRecordButton;

window.BUFFERSIZE = 8192;

$(document).ready(function() {

  // Make call to API to try and get token
  Token.getSttToken(function(token) {

    window.onbeforeunload = function(e) {
      localStorage.clear();
    };

    if (!token) {
      console.error('No authorization token available');
    }

    var viewContext = {
      currentModel: 'en-US_BroadbandModel',
      token: token,
      bufferSize: BUFFERSIZE
    };

    initViews(viewContext);

  });

});

},{"./Microphone":2,"./token":7,"./views/recordbutton":9}],6:[function(require,module,exports){
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

},{"./Microphone":2,"./eventbus.js":3,"./token":7}],7:[function(require,module,exports){

// For non-view logic

function getToken(which, callback) {
  var url = '/token/' + which;
  var tokenRequest = new XMLHttpRequest();
  tokenRequest.open("GET", url, true);
  tokenRequest.onload = function() {
    var token = tokenRequest.responseText;
    callback(token);
  };
  tokenRequest.send();
}

exports.getSttToken = getToken.bind(null, 'stt');

exports.getTtsToken = getToken.bind(null, 'tts');

exports.createTokenGenerator = function() {
  // Make call to API to try and get token
  return {
    getSttToken: exports.getSttToken,
    getTtsToken: exports.getTtsToken
  }
};

},{}],8:[function(require,module,exports){

'use strict';

/*globals $*/

var $lightbulb = $('#lightbulb');

module.exports = {
    on: function() {
        $lightbulb.addClass('on');
    },
    off: function() {
        $lightbulb.removeClass('on');
    }
};

},{}],9:[function(require,module,exports){

'use strict';

var Microphone = require('../Microphone');
var handleMicrophone = require('../handlemicrophone').handleMicrophone;
var eventbus = require('../eventbus.js');

exports.initRecordButton = function(ctx) {


  var running = false;
  var token = ctx.token;
  var micOptions = {
    bufferSize: ctx.buffersize
  };
  var mic = new Microphone(micOptions);

  var recordButton = $('#recordButton');

  function start() {
    handleMicrophone(token, null, mic, function(err, socket) {
      if (err) {
        var msg = 'Error: ' + err.message;
        console.log(msg);
        running = false;
      } else {
        console.log('starting mic');
        mic.record();
        running = true;
      }
    });
  }

  function stop() {
    console.log('Stopping microphone, sending stop action message');
    recordButton.find('i').removeClass('fa-stop').addClass('fa-microphone');
    mic.stop();
    running = false;
  }

  eventbus.subscribe('socetstop', stop)
  eventbus.subscribe('hardsocketstop', stop)

  recordButton.click(function(evt) {
      // Prevent default anchor behavior
      evt.preventDefault();

      recordButton.find('i').removeClass('fa-microphone').addClass('fa-stop');

      if (!running) {
        console.log('Not running, handleMicrophone()');
        start();
      } else {
        stop();
      }
  });
};

},{"../Microphone":2,"../eventbus.js":3,"../handlemicrophone":4}]},{},[5])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwic3JjL01pY3JvcGhvbmUuanMiLCJzcmMvZXZlbnRidXMuanMiLCJzcmMvaGFuZGxlbWljcm9waG9uZS5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9zb2NrZXQuanMiLCJzcmMvdG9rZW4uanMiLCJzcmMvdmlld3MvbGlnaHRidWxiLmpzIiwic3JjL3ZpZXdzL3JlY29yZGJ1dHRvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNCBJQk0gQ29ycC4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgJ0xpY2Vuc2UnKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3Rva2VuJyk7XG4vKipcbiAqIENhcHR1cmVzIG1pY3JvcGhvbmUgaW5wdXQgZnJvbSB0aGUgYnJvd3Nlci5cbiAqIFdvcmtzIGF0IGxlYXN0IG9uIGxhdGVzdCB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBDaHJvbWVcbiAqL1xuZnVuY3Rpb24gTWljcm9waG9uZShfb3B0aW9ucykge1xuICB2YXIgb3B0aW9ucyA9IF9vcHRpb25zIHx8IHt9O1xuXG4gIC8vIHdlIHJlY29yZCBpbiBtb25vIGJlY2F1c2UgdGhlIHNwZWVjaCByZWNvZ25pdGlvbiBzZXJ2aWNlXG4gIC8vIGRvZXMgbm90IHN1cHBvcnQgc3RlcmVvLlxuICB0aGlzLmJ1ZmZlclNpemUgPSBvcHRpb25zLmJ1ZmZlclNpemUgfHwgODE5MjtcbiAgdGhpcy5pbnB1dENoYW5uZWxzID0gb3B0aW9ucy5pbnB1dENoYW5uZWxzIHx8IDE7XG4gIHRoaXMub3V0cHV0Q2hhbm5lbHMgPSBvcHRpb25zLm91dHB1dENoYW5uZWxzIHx8IDE7XG4gIHRoaXMucmVjb3JkaW5nID0gZmFsc2U7XG4gIHRoaXMucmVxdWVzdGVkQWNjZXNzID0gZmFsc2U7XG4gIHRoaXMuc2FtcGxlUmF0ZSA9IDE2MDAwO1xuICAvLyBhdXhpbGlhciBidWZmZXIgdG8ga2VlcCB1bnVzZWQgc2FtcGxlcyAodXNlZCB3aGVuIGRvaW5nIGRvd25zYW1wbGluZylcbiAgdGhpcy5idWZmZXJVbnVzZWRTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheSgwKTtcblxuICAvLyBDaHJvbWUgb3IgRmlyZWZveCBvciBJRSBVc2VyIG1lZGlhXG4gIGlmICghbmF2aWdhdG9yLmdldFVzZXJNZWRpYSkge1xuICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWE7XG4gIH1cblxufVxuXG4vKipcbiAqIENhbGxlZCB3aGVuIHRoZSB1c2VyIHJlamVjdCB0aGUgdXNlIG9mIHRoZSBtaWNocm9waG9uZVxuICogQHBhcmFtICBlcnJvciBUaGUgZXJyb3JcbiAqL1xuTWljcm9waG9uZS5wcm90b3R5cGUub25QZXJtaXNzaW9uUmVqZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ01pY3JvcGhvbmUub25QZXJtaXNzaW9uUmVqZWN0ZWQoKScpO1xuICB0aGlzLnJlcXVlc3RlZEFjY2VzcyA9IGZhbHNlO1xuICB0aGlzLm9uRXJyb3IoJ1Blcm1pc3Npb24gdG8gYWNjZXNzIHRoZSBtaWNyb3Bob25lIHJlamV0ZWQuJyk7XG59O1xuXG5NaWNyb3Bob25lLnByb3RvdHlwZS5vbkVycm9yID0gZnVuY3Rpb24oZXJyb3IpIHtcbiAgY29uc29sZS5sb2coJ01pY3JvcGhvbmUub25FcnJvcigpOicsIGVycm9yKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHdoZW4gdGhlIHVzZXIgYXV0aG9yaXplcyB0aGUgdXNlIG9mIHRoZSBtaWNyb3Bob25lLlxuICogQHBhcmFtICB7T2JqZWN0fSBzdHJlYW0gVGhlIFN0cmVhbSB0byBjb25uZWN0IHRvXG4gKlxuICovXG5NaWNyb3Bob25lLnByb3RvdHlwZS5vbk1lZGlhU3RyZWFtID0gIGZ1bmN0aW9uKHN0cmVhbSkge1xuICB2YXIgQXVkaW9DdHggPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cbiAgaWYgKCFBdWRpb0N0eClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1ZGlvQ29udGV4dCBub3QgYXZhaWxhYmxlJyk7XG5cbiAgaWYgKCF0aGlzLmF1ZGlvQ29udGV4dClcbiAgICB0aGlzLmF1ZGlvQ29udGV4dCA9IG5ldyBBdWRpb0N0eCgpO1xuXG4gIHZhciBnYWluID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICB2YXIgYXVkaW9JbnB1dCA9IHRoaXMuYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XG5cbiAgYXVkaW9JbnB1dC5jb25uZWN0KGdhaW4pO1xuXG4gIHRoaXMubWljID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKHRoaXMuYnVmZmVyU2l6ZSxcbiAgICB0aGlzLmlucHV0Q2hhbm5lbHMsIHRoaXMub3V0cHV0Q2hhbm5lbHMpO1xuXG4gIC8vIHVuY29tbWVudCB0aGUgZm9sbG93aW5nIGxpbmUgaWYgeW91IHdhbnQgdG8gdXNlIHlvdXIgbWljcm9waG9uZSBzYW1wbGUgcmF0ZVxuICAvL3RoaXMuc2FtcGxlUmF0ZSA9IHRoaXMuYXVkaW9Db250ZXh0LnNhbXBsZVJhdGU7XG4gIGNvbnNvbGUubG9nKCdNaWNyb3Bob25lLm9uTWVkaWFTdHJlYW0oKTogc2FtcGxpbmcgcmF0ZSBpczonLCB0aGlzLnNhbXBsZVJhdGUpO1xuXG4gIHRoaXMubWljLm9uYXVkaW9wcm9jZXNzID0gdGhpcy5fb25hdWRpb3Byb2Nlc3MuYmluZCh0aGlzKTtcbiAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG5cbiAgZ2Fpbi5jb25uZWN0KHRoaXMubWljKTtcbiAgdGhpcy5taWMuY29ubmVjdCh0aGlzLmF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gIHRoaXMucmVjb3JkaW5nID0gdHJ1ZTtcbiAgdGhpcy5yZXF1ZXN0ZWRBY2Nlc3MgPSBmYWxzZTtcbiAgdGhpcy5vblN0YXJ0UmVjb3JkaW5nKCk7XG59O1xuXG4vKipcbiAqIGNhbGxiYWNrIHRoYXQgaXMgYmVpbmcgdXNlZCBieSB0aGUgbWljcm9waG9uZVxuICogdG8gc2VuZCBhdWRpbyBjaHVua3MuXG4gKiBAcGFyYW0gIHtvYmplY3R9IGRhdGEgYXVkaW9cbiAqL1xuTWljcm9waG9uZS5wcm90b3R5cGUuX29uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24oZGF0YSkge1xuICBpZiAoIXRoaXMucmVjb3JkaW5nKSB7XG4gICAgLy8gV2Ugc3BlYWsgYnV0IHdlIGFyZSBub3QgcmVjb3JkaW5nXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gU2luZ2xlIGNoYW5uZWxcbiAgdmFyIGNoYW4gPSBkYXRhLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApOyAgXG4gIFxuICAvL3Jlc2FtcGxlcih0aGlzLmF1ZGlvQ29udGV4dC5zYW1wbGVSYXRlLGRhdGEuaW5wdXRCdWZmZXIsdGhpcy5vbkF1ZGlvKTtcblxuICB0aGlzLm9uQXVkaW8odGhpcy5fZXhwb3J0RGF0YUJ1ZmZlclRvMTZLaHoobmV3IEZsb2F0MzJBcnJheShjaGFuKSkpO1xuXG4gIC8vZXhwb3J0IHdpdGggbWljcm9waG9uZSBtaHosIHJlbWVtYmVyIHRvIHVwZGF0ZSB0aGUgdGhpcy5zYW1wbGVSYXRlXG4gIC8vIHdpdGggdGhlIHNhbXBsZSByYXRlIGZyb20geW91ciBtaWNyb3Bob25lXG4gIC8vIHRoaXMub25BdWRpbyh0aGlzLl9leHBvcnREYXRhQnVmZmVyKG5ldyBGbG9hdDMyQXJyYXkoY2hhbikpKTtcblxufTtcblxuLyoqXG4gKiBTdGFydCB0aGUgYXVkaW8gcmVjb3JkaW5nXG4gKi9cbk1pY3JvcGhvbmUucHJvdG90eXBlLnJlY29yZCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIW5hdmlnYXRvci5nZXRVc2VyTWVkaWEpe1xuICAgIHRoaXMub25FcnJvcignQnJvd3NlciBkb2VzblxcJ3Qgc3VwcG9ydCBtaWNyb3Bob25lIGlucHV0Jyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0aGlzLnJlcXVlc3RlZEFjY2Vzcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRoaXMucmVxdWVzdGVkQWNjZXNzID0gdHJ1ZTtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSh7IGF1ZGlvOiB0cnVlIH0sXG4gICAgdGhpcy5vbk1lZGlhU3RyZWFtLmJpbmQodGhpcyksIC8vIE1pY3JvcGhvbmUgcGVybWlzc2lvbiBncmFudGVkXG4gICAgdGhpcy5vblBlcm1pc3Npb25SZWplY3RlZC5iaW5kKHRoaXMpKTsgLy8gTWljcm9waG9uZSBwZXJtaXNzaW9uIHJlamVjdGVkXG59O1xuXG4vKipcbiAqIFN0b3AgdGhlIGF1ZGlvIHJlY29yZGluZ1xuICovXG5NaWNyb3Bob25lLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5yZWNvcmRpbmcpXG4gICAgcmV0dXJuO1xuICB0aGlzLnJlY29yZGluZyA9IGZhbHNlO1xuICB0aGlzLnN0cmVhbS5zdG9wKCk7XG4gIHRoaXMucmVxdWVzdGVkQWNjZXNzID0gZmFsc2U7XG4gIHRoaXMubWljLmRpc2Nvbm5lY3QoMCk7XG4gIHRoaXMubWljID0gbnVsbDtcbiAgdGhpcy5vblN0b3BSZWNvcmRpbmcoKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIEJsb2IgdHlwZTogJ2F1ZGlvL2wxNicgd2l0aCB0aGUgY2h1bmsgYW5kIGRvd25zYW1wbGluZyB0byAxNiBrSHpcbiAqIGNvbWluZyBmcm9tIHRoZSBtaWNyb3Bob25lLlxuICogRXhwbGFuYXRpb24gZm9yIHRoZSBtYXRoOiBUaGUgcmF3IHZhbHVlcyBjYXB0dXJlZCBmcm9tIHRoZSBXZWIgQXVkaW8gQVBJIGFyZVxuICogaW4gMzItYml0IEZsb2F0aW5nIFBvaW50LCBiZXR3ZWVuIC0xIGFuZCAxIChwZXIgdGhlIHNwZWNpZmljYXRpb24pLlxuICogVGhlIHZhbHVlcyBmb3IgMTYtYml0IFBDTSByYW5nZSBiZXR3ZWVuIC0zMjc2OCBhbmQgKzMyNzY3ICgxNi1iaXQgc2lnbmVkIGludGVnZXIpLlxuICogTXVsdGlwbHkgdG8gY29udHJvbCB0aGUgdm9sdW1lIG9mIHRoZSBvdXRwdXQuIFdlIHN0b3JlIGluIGxpdHRsZSBlbmRpYW4uXG4gKiBAcGFyYW0gIHtPYmplY3R9IGJ1ZmZlciBNaWNyb3Bob25lIGF1ZGlvIGNodW5rXG4gKiBAcmV0dXJuIHtCbG9ifSAnYXVkaW8vbDE2JyBjaHVua1xuICogQGRlcHJlY2F0ZWQgVGhpcyBtZXRob2QgaXMgZGVwcmFjYXRlZFxuICovXG5NaWNyb3Bob25lLnByb3RvdHlwZS5fZXhwb3J0RGF0YUJ1ZmZlclRvMTZLaHogPSBmdW5jdGlvbihidWZmZXJOZXdTYW1wbGVzKSB7XG4gIHZhciBidWZmZXIgPSBudWxsLFxuICAgIG5ld1NhbXBsZXMgPSBidWZmZXJOZXdTYW1wbGVzLmxlbmd0aCxcbiAgICB1bnVzZWRTYW1wbGVzID0gdGhpcy5idWZmZXJVbnVzZWRTYW1wbGVzLmxlbmd0aDsgICBcbiAgICBcblxuICBpZiAodW51c2VkU2FtcGxlcyA+IDApIHtcbiAgICBidWZmZXIgPSBuZXcgRmxvYXQzMkFycmF5KHVudXNlZFNhbXBsZXMgKyBuZXdTYW1wbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVudXNlZFNhbXBsZXM7ICsraSkge1xuICAgICAgYnVmZmVyW2ldID0gdGhpcy5idWZmZXJVbnVzZWRTYW1wbGVzW2ldO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgbmV3U2FtcGxlczsgKytpKSB7XG4gICAgICBidWZmZXJbdW51c2VkU2FtcGxlcyArIGldID0gYnVmZmVyTmV3U2FtcGxlc1tpXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgYnVmZmVyID0gYnVmZmVyTmV3U2FtcGxlcztcbiAgfVxuXG4gIC8vIGRvd25zYW1wbGluZyB2YXJpYWJsZXNcbiAgdmFyIGZpbHRlciA9IFtcbiAgICAgIC0wLjAzNzkzNSwgLTAuMDAwODkwMjQsIDAuMDQwMTczLCAwLjAxOTk4OSwgMC4wMDQ3NzkyLCAtMC4wNTg2NzUsIC0wLjA1NjQ4NyxcbiAgICAgIC0wLjAwNDA2NTMsIDAuMTQ1MjcsIDAuMjY5MjcsIDAuMzM5MTMsIDAuMjY5MjcsIDAuMTQ1MjcsIC0wLjAwNDA2NTMsIC0wLjA1NjQ4NyxcbiAgICAgIC0wLjA1ODY3NSwgMC4wMDQ3NzkyLCAwLjAxOTk4OSwgMC4wNDAxNzMsIC0wLjAwMDg5MDI0LCAtMC4wMzc5MzVcbiAgICBdLFxuICAgIHNhbXBsaW5nUmF0ZVJhdGlvID0gdGhpcy5hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSAvIDE2MDAwLFxuICAgIG5PdXRwdXRTYW1wbGVzID0gTWF0aC5mbG9vcigoYnVmZmVyLmxlbmd0aCAtIGZpbHRlci5sZW5ndGgpIC8gKHNhbXBsaW5nUmF0ZVJhdGlvKSkgKyAxLFxuICAgIHBjbUVuY29kZWRCdWZmZXIxNmsgPSBuZXcgQXJyYXlCdWZmZXIobk91dHB1dFNhbXBsZXMgKiAyKSxcbiAgICBkYXRhVmlldzE2ayA9IG5ldyBEYXRhVmlldyhwY21FbmNvZGVkQnVmZmVyMTZrKSxcbiAgICBpbmRleCA9IDAsXG4gICAgdm9sdW1lID0gMHg3RkZGLCAvL3JhbmdlIGZyb20gMCB0byAweDdGRkYgdG8gY29udHJvbCB0aGUgdm9sdW1lXG4gICAgbk91dCA9IDA7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgKyBmaWx0ZXIubGVuZ3RoIC0gMSA8IGJ1ZmZlci5sZW5ndGg7IGkgPSBNYXRoLnJvdW5kKHNhbXBsaW5nUmF0ZVJhdGlvICogbk91dCkpIHtcbiAgICB2YXIgc2FtcGxlID0gMDtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZpbHRlci5sZW5ndGg7ICsraikge1xuICAgICAgc2FtcGxlICs9IGJ1ZmZlcltpICsgal0gKiBmaWx0ZXJbal07XG4gICAgfVxuICAgIHNhbXBsZSAqPSB2b2x1bWU7XG4gICAgZGF0YVZpZXcxNmsuc2V0SW50MTYoaW5kZXgsIHNhbXBsZSwgdHJ1ZSk7IC8vICd0cnVlJyAtPiBtZWFucyBsaXR0bGUgZW5kaWFuXG4gICAgaW5kZXggKz0gMjtcbiAgICBuT3V0Kys7XG4gIH1cblxuICB2YXIgaW5kZXhTYW1wbGVBZnRlckxhc3RVc2VkID0gTWF0aC5yb3VuZChzYW1wbGluZ1JhdGVSYXRpbyAqIG5PdXQpO1xuICB2YXIgcmVtYWluaW5nID0gYnVmZmVyLmxlbmd0aCAtIGluZGV4U2FtcGxlQWZ0ZXJMYXN0VXNlZDtcbiAgaWYgKHJlbWFpbmluZyA+IDApIHtcbiAgICB0aGlzLmJ1ZmZlclVudXNlZFNhbXBsZXMgPSBuZXcgRmxvYXQzMkFycmF5KHJlbWFpbmluZyk7XG4gICAgZm9yIChpID0gMDsgaSA8IHJlbWFpbmluZzsgKytpKSB7XG4gICAgICB0aGlzLmJ1ZmZlclVudXNlZFNhbXBsZXNbaV0gPSBidWZmZXJbaW5kZXhTYW1wbGVBZnRlckxhc3RVc2VkICsgaV07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuYnVmZmVyVW51c2VkU2FtcGxlcyA9IG5ldyBGbG9hdDMyQXJyYXkoMCk7XG4gIH1cblxuICByZXR1cm4gbmV3IEJsb2IoW2RhdGFWaWV3MTZrXSwge1xuICAgIHR5cGU6ICdhdWRpby9sMTYnXG4gIH0pO1xuICB9O1xuXG4gIFxuICBcbi8vIG5hdGl2ZSB3YXkgb2YgcmVzYW1wbGluZyBjYXB0dXJlZCBhdWRpb1xudmFyIHJlc2FtcGxlciA9IGZ1bmN0aW9uKHNhbXBsZVJhdGUsIGF1ZGlvQnVmZmVyLCBjYWxsYmFja1Byb2Nlc3NBdWRpbykge1xuXHRcblx0Y29uc29sZS5sb2coXCJsZW5ndGg6IFwiICsgYXVkaW9CdWZmZXIubGVuZ3RoICsgXCIgXCIgKyBzYW1wbGVSYXRlKTtcblx0dmFyIGNoYW5uZWxzID0gMTsgXG5cdHZhciB0YXJnZXRTYW1wbGVSYXRlID0gMTYwMDA7XG4gICB2YXIgbnVtU2FtcGxlc1RhcmdldCA9IGF1ZGlvQnVmZmVyLmxlbmd0aCAqIHRhcmdldFNhbXBsZVJhdGUgLyBzYW1wbGVSYXRlO1xuXG4gICB2YXIgb2ZmbGluZUNvbnRleHQgPSBuZXcgT2ZmbGluZUF1ZGlvQ29udGV4dChjaGFubmVscywgbnVtU2FtcGxlc1RhcmdldCwgdGFyZ2V0U2FtcGxlUmF0ZSk7XG4gICB2YXIgYnVmZmVyU291cmNlID0gb2ZmbGluZUNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICBidWZmZXJTb3VyY2UuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG5cblx0Ly8gY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgcmVzYW1wbGluZyBmaW5pc2hlc1xuICAgb2ZmbGluZUNvbnRleHQub25jb21wbGV0ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7ICAgXHRcbiAgICAgIHZhciBzYW1wbGVzVGFyZ2V0ID0gZXZlbnQucmVuZGVyZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnRG9uZSByZXNhbXBsaW5nOiAnICsgc2FtcGxlc1RhcmdldC5sZW5ndGggKyBcIiBzYW1wbGVzIHByb2R1Y2VkXCIpOyAgXG5cblx0XHQvLyBjb252ZXJ0IGZyb20gWy0xLDFdIHJhbmdlIG9mIGZsb2F0aW5nIHBvaW50IG51bWJlcnMgdG8gWy0zMjc2NywzMjc2N10gcmFuZ2Ugb2YgaW50ZWdlcnNcblx0XHR2YXIgaW5kZXggPSAwO1xuXHRcdHZhciB2b2x1bWUgPSAweDdGRkY7XG4gIFx0XHR2YXIgcGNtRW5jb2RlZEJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihzYW1wbGVzVGFyZ2V0Lmxlbmd0aCoyKTsgICAgLy8gc2hvcnQgaW50ZWdlciB0byBieXRlXG4gIFx0XHR2YXIgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcocGNtRW5jb2RlZEJ1ZmZlcik7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNhbXBsZXNUYXJnZXQubGVuZ3RoOyBpKyspIHtcbiAgICBcdFx0ZGF0YVZpZXcuc2V0SW50MTYoaW5kZXgsIHNhbXBsZXNUYXJnZXRbaV0qdm9sdW1lLCB0cnVlKTtcbiAgICBcdFx0aW5kZXggKz0gMjtcbiAgXHRcdH1cblxuICAgICAgLy8gbDE2IGlzIHRoZSBNSU1FIHR5cGUgZm9yIDE2LWJpdCBQQ01cbiAgICAgIGNhbGxiYWNrUHJvY2Vzc0F1ZGlvKG5ldyBCbG9iKFtkYXRhVmlld10sIHsgdHlwZTogJ2F1ZGlvL2wxNicgfSkpOyAgICAgICAgIFxuICAgfTtcblxuICAgYnVmZmVyU291cmNlLmNvbm5lY3Qob2ZmbGluZUNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgYnVmZmVyU291cmNlLnN0YXJ0KDApO1xuICAgb2ZmbGluZUNvbnRleHQuc3RhcnRSZW5kZXJpbmcoKTsgICBcbn07XG4gXG4gIFxuXG4vKipcbiAqIENyZWF0ZXMgYSBCbG9iIHR5cGU6ICdhdWRpby9sMTYnIHdpdGggdGhlXG4gKiBjaHVuayBjb21pbmcgZnJvbSB0aGUgbWljcm9waG9uZS5cbiAqL1xudmFyIGV4cG9ydERhdGFCdWZmZXIgPSBmdW5jdGlvbihidWZmZXIsIGJ1ZmZlclNpemUpIHtcbiAgdmFyIHBjbUVuY29kZWRCdWZmZXIgPSBudWxsLFxuICAgIGRhdGFWaWV3ID0gbnVsbCxcbiAgICBpbmRleCA9IDAsXG4gICAgdm9sdW1lID0gMHg3RkZGOyAvL3JhbmdlIGZyb20gMCB0byAweDdGRkYgdG8gY29udHJvbCB0aGUgdm9sdW1lXG5cbiAgcGNtRW5jb2RlZEJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXJTaXplICogMik7XG4gIGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KHBjbUVuY29kZWRCdWZmZXIpO1xuXG4gIC8qIEV4cGxhbmF0aW9uIGZvciB0aGUgbWF0aDogVGhlIHJhdyB2YWx1ZXMgY2FwdHVyZWQgZnJvbSB0aGUgV2ViIEF1ZGlvIEFQSSBhcmVcbiAgICogaW4gMzItYml0IEZsb2F0aW5nIFBvaW50LCBiZXR3ZWVuIC0xIGFuZCAxIChwZXIgdGhlIHNwZWNpZmljYXRpb24pLlxuICAgKiBUaGUgdmFsdWVzIGZvciAxNi1iaXQgUENNIHJhbmdlIGJldHdlZW4gLTMyNzY4IGFuZCArMzI3NjcgKDE2LWJpdCBzaWduZWQgaW50ZWdlcikuXG4gICAqIE11bHRpcGx5IHRvIGNvbnRyb2wgdGhlIHZvbHVtZSBvZiB0aGUgb3V0cHV0LiBXZSBzdG9yZSBpbiBsaXR0bGUgZW5kaWFuLlxuICAgKi9cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICBkYXRhVmlldy5zZXRJbnQxNihpbmRleCwgYnVmZmVyW2ldICogdm9sdW1lLCB0cnVlKTtcbiAgICBpbmRleCArPSAyO1xuICB9XG5cbiAgLy8gbDE2IGlzIHRoZSBNSU1FIHR5cGUgZm9yIDE2LWJpdCBQQ01cbiAgcmV0dXJuIG5ldyBCbG9iKFtkYXRhVmlld10sIHsgdHlwZTogJ2F1ZGlvL2wxNicgfSk7XG59O1xuXG5NaWNyb3Bob25lLnByb3RvdHlwZS5fZXhwb3J0RGF0YUJ1ZmZlciA9IGZ1bmN0aW9uKGJ1ZmZlcil7XG4gIHV0aWxzLmV4cG9ydERhdGFCdWZmZXIoYnVmZmVyLCB0aGlzLmJ1ZmZlclNpemUpO1xufTsgXG5cblxuLy8gRnVuY3Rpb25zIHVzZWQgdG8gY29udHJvbCBNaWNyb3Bob25lIGV2ZW50cyBsaXN0ZW5lcnMuXG5NaWNyb3Bob25lLnByb3RvdHlwZS5vblN0YXJ0UmVjb3JkaW5nID0gIGZ1bmN0aW9uKCkge307XG5NaWNyb3Bob25lLnByb3RvdHlwZS5vblN0b3BSZWNvcmRpbmcgPSAgZnVuY3Rpb24oKSB7fTtcbk1pY3JvcGhvbmUucHJvdG90eXBlLm9uQXVkaW8gPSAgZnVuY3Rpb24oKSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWNyb3Bob25lO1xuXG4iLCIndXNlIHN0cmljdCc7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XG5cbnZhciBidXMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbmJ1cy5zdWJzY3JpYmUgPSBidXMub247XG5idXMudW5zdWJzY3JpYmUgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAobGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIGJ1cy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGJ1cy5yZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpO1xuICAgIH1cbn07XG5idXMucHVibGlzaCA9IGJ1cy5lbWl0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJ1cztcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5pdFNvY2tldCA9IHJlcXVpcmUoJy4vc29ja2V0JykuaW5pdFNvY2tldDtcbnZhciBsaWdodGJ1bGIgPSByZXF1aXJlKCcuL3ZpZXdzL2xpZ2h0YnVsYi5qcycpO1xuXG5leHBvcnRzLmhhbmRsZU1pY3JvcGhvbmUgPSBmdW5jdGlvbih0b2tlbiwgbW9kZWwsIG1pYywgY2FsbGJhY2spIHtcblxuICB2YXIgb3B0aW9ucyA9IHt9O1xuICBvcHRpb25zLnRva2VuID0gdG9rZW47XG4gIG9wdGlvbnMubWVzc2FnZSA9IHtcbiAgICAnYWN0aW9uJzogJ3N0YXJ0JyxcbiAgICAnY29udGVudC10eXBlJzogJ2F1ZGlvL2wxNjtyYXRlPTE2MDAwJyxcbiAgICAnaW50ZXJpbV9yZXN1bHRzJzogdHJ1ZSxcbiAgICAnY29udGludW91cyc6IHRydWUsXG4gICAgJ3dvcmRfY29uZmlkZW5jZSc6IHRydWUsXG4gICAgJ3RpbWVzdGFtcHMnOiB0cnVlLFxuICAgICdtYXhfYWx0ZXJuYXRpdmVzJzogMyxcbiAgICAnaW5hY3Rpdml0eV90aW1lb3V0JzogNjAwICAgIFxuICB9O1xuICBvcHRpb25zLm1vZGVsID0gbW9kZWw7XG5cbiAgZnVuY3Rpb24gb25PcGVuKHNvY2tldCkge1xuICAgIGNvbnNvbGUubG9nKCdNaWMgc29ja2V0OiBvcGVuZWQnKTtcbiAgICBjYWxsYmFjayhudWxsLCBzb2NrZXQpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25MaXN0ZW5pbmcoc29ja2V0KSB7XG5cbiAgICBtaWMub25BdWRpbyA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgICAgIGlmIChzb2NrZXQucmVhZHlTdGF0ZSA8IDIpIHtcbiAgICAgICAgc29ja2V0LnNlbmQoYmxvYilcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cblxuICAvLyBjaGVjayBhbGwgYWx0ZXJuYXRpdmVzIGZvciBhIHBvc3NpYmxlIG1hdGNoIGFnYWluc3QgYW55IG9mIHRoZSBleHBlY3RlZCBwZXJtdXRhdGlvbnNcbiAgLy8gcmV0dXJuIHRydWUgYXMgc29vbiBhcyBvbmUgaXMgZm91bmQsIG9yIGZhbHNlIGlmIG5vbmUgaXMgZm91bmRcbiAgZnVuY3Rpb24gbWF0Y2hlcyhhbHRlcm5hdGl2ZXMsIHBvc2liaWxpdGllcykge1xuICAgIHJldHVybiBhbHRlcm5hdGl2ZXMuc29tZShmdW5jdGlvbihhKSB7XG4gICAgICByZXR1cm4gcG9zaWJpbGl0aWVzLnNvbWUoZnVuY3Rpb24ocCkge1xuICAgICAgICByZXR1cm4gYS50cmFuc2NyaXB0LmluZGV4T2YocCkgIT0gLTE7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG5cbiAgdmFyIHJlcTtcblxuXG4gIGZ1bmN0aW9uIG9uTWVzc2FnZShtc2csIHNvY2tldCkge1xuICAgIGNvbnNvbGUubG9nKCdNaWMgc29ja2V0IG1zZzogJywgbXNnKTtcbiAgICBpZiAobXNnLnJlc3VsdHMgJiYgbXNnLnJlc3VsdHNbMF0uYWx0ZXJuYXRpdmVzLmxlbmd0aCkge1xuICAgICAgdmFyIHJlc3VsdCA9IG1zZy5yZXN1bHRzWzBdO1xuICAgICAgdmFyIGFsdGVybmF0aXZlcyA9IHJlc3VsdC5hbHRlcm5hdGl2ZXM7XG4gICAgICBpZiAobWF0Y2hlcyhhbHRlcm5hdGl2ZXMsIFsnb24nLCAnb3duJywgJ29saW4nLCAnc28nXSkpIHtcbiAgICAgICAgbGlnaHRidWxiLm9uKCk7XG4gICAgICAgIHJlcSAmJiByZXEuYWJvcnQoKTtcbiAgICAgICAgcmVxID0gJC5nZXRKU09OKCdodHRwOi8vd2F0c29uLWlvdC5teWJsdWVtaXgubmV0L2xlZD9vbj10cnVlJmNhbGxiYWNrPT8nLCBjb25zb2xlLmxvZyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChtYXRjaGVzKGFsdGVybmF0aXZlcywgWydvZmYnXSkpIHtcbiAgICAgICAgbGlnaHRidWxiLm9mZigpO1xuICAgICAgICByZXEgJiYgcmVxLmFib3J0KCk7XG4gICAgICAgIHJlcSA9ICQuZ2V0SlNPTignaHR0cDovL3dhdHNvbi1pb3QubXlibHVlbWl4Lm5ldC9sZWQ/b249ZmFsc2UmY2FsbGJhY2s9PycsIGNvbnNvbGUubG9nKTtcbiAgICAgIH1cblxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uRXJyb3IoZXJyLCBzb2NrZXQpIHtcbiAgICBjb25zb2xlLmxvZygnTWljIHNvY2tldCBlcnI6ICcsIGVycik7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsb3NlKGV2dCkge1xuICAgIGNvbnNvbGUubG9nKCdNaWMgc29ja2V0IGNsb3NlOiAnLCBldnQpO1xuICB9XG5cbiAgaW5pdFNvY2tldChvcHRpb25zLCBvbk9wZW4sIG9uTGlzdGVuaW5nLCBvbk1lc3NhZ2UsIG9uRXJyb3IsIG9uQ2xvc2UpO1xuXG59O1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNCBJQk0gQ29ycC4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIE1pY3JvcGhvbmUgPSByZXF1aXJlKCcuL01pY3JvcGhvbmUnKTtcbnZhciBUb2tlbiA9IHJlcXVpcmUoJy4vdG9rZW4nKTtcbnZhciBpbml0Vmlld3MgPSByZXF1aXJlKCcuL3ZpZXdzL3JlY29yZGJ1dHRvbicpLmluaXRSZWNvcmRCdXR0b247XG5cbndpbmRvdy5CVUZGRVJTSVpFID0gODE5MjtcblxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG5cbiAgLy8gTWFrZSBjYWxsIHRvIEFQSSB0byB0cnkgYW5kIGdldCB0b2tlblxuICBUb2tlbi5nZXRTdHRUb2tlbihmdW5jdGlvbih0b2tlbikge1xuXG4gICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oZSkge1xuICAgICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG4gICAgfTtcblxuICAgIGlmICghdG9rZW4pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGF1dGhvcml6YXRpb24gdG9rZW4gYXZhaWxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIHZpZXdDb250ZXh0ID0ge1xuICAgICAgY3VycmVudE1vZGVsOiAnZW4tVVNfQnJvYWRiYW5kTW9kZWwnLFxuICAgICAgdG9rZW46IHRva2VuLFxuICAgICAgYnVmZmVyU2l6ZTogQlVGRkVSU0laRVxuICAgIH07XG5cbiAgICBpbml0Vmlld3Modmlld0NvbnRleHQpO1xuXG4gIH0pO1xuXG59KTtcbiIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTQgSUJNIENvcnAuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdG9rZW4nKTtcbnZhciBNaWNyb3Bob25lID0gcmVxdWlyZSgnLi9NaWNyb3Bob25lJyk7XG52YXIgZXZlbnRidXMgPSByZXF1aXJlKCcuL2V2ZW50YnVzLmpzJyk7IC8vIHRvZG86IG1ha2UgdGhpcyB0aGluZyBqdXN0IGVtaXQgaXQncyBvd24gZXZlbnRzIGluc3RlYWQgb2YgdXNpbmcgYSBzaGFyZWQgYnVzXG5cbi8vIE1pbmkgV1MgY2FsbGJhY2sgQVBJLCBzbyB3ZSBjYW4gaW5pdGlhbGl6ZVxuLy8gd2l0aCBtb2RlbCBhbmQgdG9rZW4gaW4gVVJJLCBwbHVzXG4vLyBzdGFydCBtZXNzYWdlXG5cbi8vIEluaXRpYWxpemUgY2xvc3VyZSwgd2hpY2ggaG9sZHMgbWF4aW11bSBnZXRUb2tlbiBjYWxsIGNvdW50XG52YXIgdG9rZW5HZW5lcmF0b3IgPSB1dGlscy5jcmVhdGVUb2tlbkdlbmVyYXRvcigpO1xuXG5leHBvcnRzLmluaXRTb2NrZXQgPSBmdW5jdGlvbiBpbml0U29ja2V0KG9wdGlvbnMsIG9ub3Blbiwgb25saXN0ZW5pbmcsIG9ubWVzc2FnZSwgb25lcnJvciwgb25jbG9zZSkge1xuICB2YXIgbGlzdGVuaW5nO1xuICB2YXIgc29ja2V0O1xuICB2YXIgdG9rZW4gPSBvcHRpb25zLnRva2VuO1xuICB2YXIgbW9kZWwgPSBvcHRpb25zLm1vZGVsIHx8ICdlbi1VU19Ccm9hZGJhbmRNb2RlbCc7XG4gIHZhciBzdGFydE1lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2UgfHwgeydhY3Rpb24nOiAnc3RhcnQnfTtcbiAgdmFyIHVybCA9IG9wdGlvbnMuc2VydmljZVVSSSB8fCAnd3NzOi8vc3RyZWFtLndhdHNvbnBsYXRmb3JtLm5ldC9zcGVlY2gtdG8tdGV4dC9hcGkvdjEvcmVjb2duaXplPydcbiAgICArICdtb2RlbD0nICsgbW9kZWxcbiAgICArICcmWC1XREMtUEwtT1BULU9VVD0wJ1xuICAgICsgJyZ3YXRzb24tdG9rZW49JyArIHRva2VuO1xuICBjb25zb2xlLmxvZygnV1MgVVJMJywgdXJsKTtcbiAgdHJ5IHtcbiAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG4gIH0gY2F0Y2goZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcignV1MgY29ubmVjdGlvbiBlcnJvcjogJywgZXJyKTtcbiAgfVxuICBzb2NrZXQub25vcGVuID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgY29uc29sZS5sb2coXCJXUyBvbm9wZW5cIiwgZXZ0KTtcbiAgICBsaXN0ZW5pbmcgPSBmYWxzZTtcbiAgICBldmVudGJ1cy5zdWJzY3JpYmUoJ2hhcmRzb2NrZXRzdG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnTUlDUk9QSE9ORTogY2xvc2UuJyk7XG4gICAgICBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7YWN0aW9uOidzdG9wJ30pKTtcbiAgICB9KTtcbiAgICBldmVudGJ1cy5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnLCBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdNSUNST1BIT05FOiBjbG9zZS4nKTtcbiAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgIH0pO1xuICAgIHNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHN0YXJ0TWVzc2FnZSkpO1xuICAgIG9ub3Blbihzb2NrZXQpO1xuICB9O1xuICBzb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgY29uc29sZS5sb2coXCJXUyBvbm1lc3NhZ2VcIiwgZXZ0KTtcbiAgICB2YXIgbXNnID0gSlNPTi5wYXJzZShldnQuZGF0YSk7XG4gICAgaWYgKG1zZy5lcnJvcikge1xuICAgICAgZXZlbnRidXMucHVibGlzaCgnaGFyZHNvY2tldHN0b3AnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG1zZy5zdGF0ZSA9PT0gJ2xpc3RlbmluZycpIHtcbiAgICAgIC8vIEVhcmx5IGN1dCBvZmYsIHdpdGhvdXQgbm90aWZpY2F0aW9uXG4gICAgICBpZiAoIWxpc3RlbmluZykge1xuICAgICAgICBvbmxpc3RlbmluZyhzb2NrZXQpO1xuICAgICAgICBsaXN0ZW5pbmcgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ01JQ1JPUEhPTkU6IENsb3Npbmcgc29ja2V0LicpO1xuICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgb25tZXNzYWdlKG1zZywgc29ja2V0KTtcbiAgfTtcblxuICBzb2NrZXQub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgIGNvbnNvbGUubG9nKCdXUyBvbmVycm9yOiAnLCBldnQpO1xuICAgIG9uZXJyb3IoZXZ0KTtcbiAgfTtcblxuICBzb2NrZXQub25jbG9zZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgIGNvbnNvbGUubG9nKCdXUyBvbmNsb3NlOiAnLCBldnQpO1xuICAgIGNvbnNvbGUubG9nKG5ldyBFcnJvcignc3RhY2snKS5zdGFjayk7XG4gICAgaWYgKGV2dC5jb2RlID09PSAxMDA2KSB7XG4gICAgICAvLyBBdXRoZW50aWNhdGlvbiBlcnJvciwgdHJ5IHRvIHJlY29ubmVjdFxuICAgICAgdG9rZW5HZW5lcmF0b3IuZ2V0U3R0VG9rZW4oZnVuY3Rpb24odG9rZW4sIGVycikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZXZlbnRidXMucHVibGlzaCgnaGFyZHNvY2tldHN0b3AnKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy50b2tlbiA9IHRva2VuO1xuICAgICAgICBpbml0U29ja2V0KG9wdGlvbnMsIG9ub3Blbiwgb25saXN0ZW5pbmcsIG9ubWVzc2FnZSwgb25lcnJvciwgb25jbG9zZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGV2dC5jb2RlID09PSAxMDExKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdTZXJ2ZXIgZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGV2dC5jb2RlID4gMTAwMCkge1xuICAgICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIE1hZGUgaXQgdGhyb3VnaCwgbm9ybWFsIGNsb3NlXG4gICAgZXZlbnRidXMudW5zdWJzY3JpYmUoJ2hhcmRzb2NrZXRzdG9wJyk7XG4gICAgZXZlbnRidXMudW5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnKTtcbiAgICBvbmNsb3NlKGV2dCk7XG4gIH07XG5cbn07XG4iLCJcbi8vIEZvciBub24tdmlldyBsb2dpY1xuXG5mdW5jdGlvbiBnZXRUb2tlbih3aGljaCwgY2FsbGJhY2spIHtcbiAgdmFyIHVybCA9ICcvdG9rZW4vJyArIHdoaWNoO1xuICB2YXIgdG9rZW5SZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHRva2VuUmVxdWVzdC5vcGVuKFwiR0VUXCIsIHVybCwgdHJ1ZSk7XG4gIHRva2VuUmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG9rZW4gPSB0b2tlblJlcXVlc3QucmVzcG9uc2VUZXh0O1xuICAgIGNhbGxiYWNrKHRva2VuKTtcbiAgfTtcbiAgdG9rZW5SZXF1ZXN0LnNlbmQoKTtcbn1cblxuZXhwb3J0cy5nZXRTdHRUb2tlbiA9IGdldFRva2VuLmJpbmQobnVsbCwgJ3N0dCcpO1xuXG5leHBvcnRzLmdldFR0c1Rva2VuID0gZ2V0VG9rZW4uYmluZChudWxsLCAndHRzJyk7XG5cbmV4cG9ydHMuY3JlYXRlVG9rZW5HZW5lcmF0b3IgPSBmdW5jdGlvbigpIHtcbiAgLy8gTWFrZSBjYWxsIHRvIEFQSSB0byB0cnkgYW5kIGdldCB0b2tlblxuICByZXR1cm4ge1xuICAgIGdldFN0dFRva2VuOiBleHBvcnRzLmdldFN0dFRva2VuLFxuICAgIGdldFR0c1Rva2VuOiBleHBvcnRzLmdldFR0c1Rva2VuXG4gIH1cbn07XG4iLCJcbid1c2Ugc3RyaWN0JztcblxuLypnbG9iYWxzICQqL1xuXG52YXIgJGxpZ2h0YnVsYiA9ICQoJyNsaWdodGJ1bGInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAkbGlnaHRidWxiLmFkZENsYXNzKCdvbicpO1xuICAgIH0sXG4gICAgb2ZmOiBmdW5jdGlvbigpIHtcbiAgICAgICAgJGxpZ2h0YnVsYi5yZW1vdmVDbGFzcygnb24nKTtcbiAgICB9XG59O1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBNaWNyb3Bob25lID0gcmVxdWlyZSgnLi4vTWljcm9waG9uZScpO1xudmFyIGhhbmRsZU1pY3JvcGhvbmUgPSByZXF1aXJlKCcuLi9oYW5kbGVtaWNyb3Bob25lJykuaGFuZGxlTWljcm9waG9uZTtcbnZhciBldmVudGJ1cyA9IHJlcXVpcmUoJy4uL2V2ZW50YnVzLmpzJyk7XG5cbmV4cG9ydHMuaW5pdFJlY29yZEJ1dHRvbiA9IGZ1bmN0aW9uKGN0eCkge1xuXG5cbiAgdmFyIHJ1bm5pbmcgPSBmYWxzZTtcbiAgdmFyIHRva2VuID0gY3R4LnRva2VuO1xuICB2YXIgbWljT3B0aW9ucyA9IHtcbiAgICBidWZmZXJTaXplOiBjdHguYnVmZmVyc2l6ZVxuICB9O1xuICB2YXIgbWljID0gbmV3IE1pY3JvcGhvbmUobWljT3B0aW9ucyk7XG5cbiAgdmFyIHJlY29yZEJ1dHRvbiA9ICQoJyNyZWNvcmRCdXR0b24nKTtcblxuICBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICBoYW5kbGVNaWNyb3Bob25lKHRva2VuLCBudWxsLCBtaWMsIGZ1bmN0aW9uKGVyciwgc29ja2V0KSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHZhciBtc2cgPSAnRXJyb3I6ICcgKyBlcnIubWVzc2FnZTtcbiAgICAgICAgY29uc29sZS5sb2cobXNnKTtcbiAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3N0YXJ0aW5nIG1pYycpO1xuICAgICAgICBtaWMucmVjb3JkKCk7XG4gICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RvcCgpIHtcbiAgICBjb25zb2xlLmxvZygnU3RvcHBpbmcgbWljcm9waG9uZSwgc2VuZGluZyBzdG9wIGFjdGlvbiBtZXNzYWdlJyk7XG4gICAgcmVjb3JkQnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnZmEtc3RvcCcpLmFkZENsYXNzKCdmYS1taWNyb3Bob25lJyk7XG4gICAgbWljLnN0b3AoKTtcbiAgICBydW5uaW5nID0gZmFsc2U7XG4gIH1cblxuICBldmVudGJ1cy5zdWJzY3JpYmUoJ3NvY2V0c3RvcCcsIHN0b3ApXG4gIGV2ZW50YnVzLnN1YnNjcmliZSgnaGFyZHNvY2tldHN0b3AnLCBzdG9wKVxuXG4gIHJlY29yZEJ1dHRvbi5jbGljayhmdW5jdGlvbihldnQpIHtcbiAgICAgIC8vIFByZXZlbnQgZGVmYXVsdCBhbmNob3IgYmVoYXZpb3JcbiAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICByZWNvcmRCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdmYS1taWNyb3Bob25lJykuYWRkQ2xhc3MoJ2ZhLXN0b3AnKTtcblxuICAgICAgaWYgKCFydW5uaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdOb3QgcnVubmluZywgaGFuZGxlTWljcm9waG9uZSgpJyk7XG4gICAgICAgIHN0YXJ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdG9wKCk7XG4gICAgICB9XG4gIH0pO1xufTtcbiJdfQ==
