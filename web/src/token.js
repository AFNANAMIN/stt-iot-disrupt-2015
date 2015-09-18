
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
