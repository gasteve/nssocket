/*
 * common.js
 *
 * (C) 2011, Nodejitsu Inc.
 */

var fs = require('fs'),
    tls = require('tls'),
    net = require('net'),
    crypto = require('crypto');

exports.createSocket = function (options) {
  options = options || {};
  options.type = options.type || 'tcp4';
  
  return options.type === 'tls' 
    ? exports.createTlsSocket(options)
    : new net.Socket(options);
};

//
// ### function createTlsSocket (options)
// #### @options {Object} Tls options like in tls.js
// #### Should behave like tls.connect, except it just creates the socket like net.Socket
// #### Also has a function called 'connect' that will allow` it to connect to a remote host
// this is a rip of tls.js's connect
//
exports.createTlsSocket = function(options) {
  var self = this;
  
  // 
  // Setup the TLS connection over the existing TCP connection:
  // 
  // 1. Create a new instance of `net.Socket`.
  // 2. Create a new set of credentials with `options`.
  // 3. Create the TLS pair
  // 4. Pipe the TLS pair to the TCP socket
  // 
  var socket = new net.Stream({ type: 'tcp4' });
  
  function setupTlsPipe () {
    var sslcontext = crypto.createCredentials(options),
        pair = tls.createSecurePair(sslcontext, false),
        cleartext = pipe(pair, socket);
        
    pair.on('error', function(err) {socket.emit('error', err);});
    pair.on('secure', function() {
      var verifyError = pair.ssl.verifyError();

      if (verifyError) {
        cleartext.authorized = false;
        cleartext.authorizationError = verifyError;
      } 
      else {
        cleartext.authorized = true;
      }
    });

    //
    // Setup the cleartext stream to have a `.connect()` method
    // which passes through to the underlying TCP socket.
    //
    socket.cleartext = cleartext;
    cleartext._controlReleased = true;
  }

  socket.on('connect', setupTlsPipe);

  return socket;
};

//
// helper function for createTlsSocket
// 
function pipe(pair, socket) {
  pair.encrypted.pipe(socket);
  socket.pipe(pair.encrypted);

  pair.fd = socket.fd;
  var cleartext = pair.cleartext;
  cleartext.socket = socket;
  cleartext.encrypted = pair.encrypted;
  cleartext.authorized = false;

  return cleartext;
}
