/**
 * Websocket connection.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'websockets'
],

function (io) {
    'use strict';

    var socket = io.connect(location.hostname);

    socket.on('connect', function() {
        // resolve promise
        console.log('connected');
    });
    
    return socket;
});
