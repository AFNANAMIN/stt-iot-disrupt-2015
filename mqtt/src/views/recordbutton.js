
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

  recordButton.click(function(evt) {
      // Prevent default anchor behavior
      evt.preventDefault();

      recordButton.find('i').removeClass('fa-microphone').addClass('fa-stop');

      var currentModel = localStorage.getItem('currentModel');

      if (!running) {
        console.log('Not running, handleMicrophone()');
        handleMicrophone(token, currentModel, mic, function(err, socket) {
          if (err) {
            var msg = 'Error: ' + err.message;
            console.log(msg);
            running = false;
          } else {
            console.log('starting mic');
            mic.record();
            running = true;
            Reveal.right();
          }
        });
      } else {
        console.log('Stopping microphone, sending stop action message');
        recordButton.find('i').removeClass('fa-stop').addClass('fa-microphone');
        mic.stop();
        running = false;
      }
  });
};
