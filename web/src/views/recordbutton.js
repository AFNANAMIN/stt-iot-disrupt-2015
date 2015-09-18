
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
