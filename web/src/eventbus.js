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
