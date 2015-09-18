
'use strict';

var Microphone = require('../Microphone');
var handleMicrophone = require('../handlemicrophone').handleMicrophone;

exports.initRecordButton = function(ctx) {


  var running = false;
  var token = ctx.token;
  var micOptions = {
    bufferSize: ctx.buffersize
  };
  var mic = new Microphone(micOptions);

  var recordButton = $('#recordButton');
  var stopButton = $('#stopButton');

  recordButton.click(function(evt) {
      if (!running) {
        console.log('Not running, handleMicrophone()');
        handleMicrophone(token, ctx.currentModel, mic, function(err, socket) {
          if (err) {
            var msg = 'Error: ' + err.message;
            console.log(msg);
            running = false;
          } else {
            console.log('starting mic');
            mic.record();
            running = true;
            mic.onStartRecording = function() {
              Reveal.right();
            }
          }
        });
      }
  });

  stopButton.click(function() {
    console.log('Stopping microphone, sending stop action message');
    mic.stop();
    running = false;
  })
};
