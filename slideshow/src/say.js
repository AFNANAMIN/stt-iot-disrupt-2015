'use strict';

function say() {
    var url = '';
    var audio = new Audio();
    audio.src = url;
    audio.play();
    return true;
}

module.exports = say;

window.say = say;
