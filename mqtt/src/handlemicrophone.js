
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
        req = $.post('http://watson-iot.mybluemix.net/led', {on: true});
      }
      else if (matches(alternatives, ['off'])) {
        lightbulb.off();
        req && req.abort();
        req = $.post('http://watson-iot.mybluemix.net/led', {on: false});
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
