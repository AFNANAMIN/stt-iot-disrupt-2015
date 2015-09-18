/**
 * Copyright 2014, 2015 IBM Corp. All Rights Reserved.
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

var express = require('express'),
    app = express(),
    errorhandler = require('errorhandler'),
    bluemix = require('./config/bluemix'),
    watson = require('watson-developer-cloud'),
    path = require('path'),
    extend = require('util')._extend;


// environmental variable points to demo's json config file
require('dotenv').load();

// For local development, put username and password in config
// or store in your environment
var sttConfig = {
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api',
  username: process.env.STT_USERNAME,
  password: process.env.STT_PASSWORD
};

// if bluemix credentials exist, then override local
var sttCredentials = extend(sttConfig, bluemix.getServiceCreds('speech_to_text'));
var sttAuthorization = watson.authorization(sttCredentials);

// do it again for text to speech
var ttsConfig = {
    version: 'v1',
    url: 'https://stream.watsonplatform.net/text-to-speech/api',
    username: process.env.TTS_USERNAME,
    password: process.env.TTS_PASSWORD
};

// if bluemix credentials exist, then override local
var ttsCredentials = extend(ttsConfig, bluemix.getServiceCreds('text_to_speech'));
var ttsAuthorization = watson.authorization(ttsCredentials);
var textToSpeech = watson.text_to_speech(ttsCredentials);


// Setup static public directory
app.use(express.static(path.join(__dirname , './public')));

// Get token from Watson using your credentials
app.get('/token/stt', function(req, res) {
  sttAuthorization.getToken({url: sttCredentials.url}, function(err, token) {
    if (err) {
      console.log('error:', err);
      res.status(err.code);
    }

    res.send(token);
  });
});

app.get('/token/tts', function(req, res) {
    ttsAuthorization.getToken({url: ttsCredentials.url}, function(err, token) {
        if (err) {
            console.log('error:', err);
            res.status(err.code);
        }

        res.send(token);
    });
});

app.get('/synthesize', function(req, res) {
    var transcript = textToSpeech.synthesize(req.query);
    transcript.on('response', function(response) {
        if (req.query.download) {
            response.headers['content-disposition'] = 'attachment; filename=transcript.ogg';
        }
    });
    transcript.on('error', function(error) {
        console.log('Synthesize error: ', error)
    });
    transcript.pipe(res);
});

// Add error handling in dev
if (!process.env.VCAP_SERVICES) {
  app.use(errorhandler());
}
var port = process.env.VCAP_APP_PORT || 2000;
app.listen(port);
console.log('listening at:', port);
