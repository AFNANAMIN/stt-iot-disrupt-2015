
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
