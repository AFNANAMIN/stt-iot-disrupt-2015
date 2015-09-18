
'use strict';

var initSocket = require('./socket').initSocket;
var say = require('./say.js');

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

  // don't tell the same joke twice ;)
  var current = 0;

  function onMessage(msg, socket) {
    console.log('Mic socket msg: ', msg);
    if (msg.results && msg.results[0].alternatives.length) {
      var result = msg.results[0];
      var alternatives = result.alternatives;
      if (current < 1 && matches(alternatives, ['next slide'])) {
        current = 1;
        $('#sayno')[0].play();
      }
      // watson doesn't understand the word "sudo", so we're going to accept a few different variations
      else if (current == 1 && matches(alternatives, ['sudo next slide', 'sue do next slide', 'see you next slide', 'su you next slide', 'sue you next slide', 'sooner next slide', 'soon do next slide', 'soon next slide', 'sue next slide', 'to do next slide'])) {
        current = msg.result_index;
        Reveal.next();
      }
      // don't let the joke get old - but now check the result_index so that we don't advance twice for a single chunk of audio (interim and final results)
      else if (current >= 2 && (current < msg.result_index) && matches(alternatives, ['next slide'])) {
        current = msg.result_index;
        Reveal.next();
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
