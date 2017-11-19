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

    var socket = io();

    socket.on('connect', function() {
        // resolve promise
        console.log('connected');
    });

    return socket;
});
