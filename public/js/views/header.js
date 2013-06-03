/**
 * Header view.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'socket'
],

function ($, _, Backbone, socket) {
    'use strict';

    return new (Backbone.View.extend({
        initialize: function () {
            var view = this;

            socket.on('connect', function() {
                view.startTimer();
            });
        },

        startTimer: function () {
            var time = 0;

            function elapsedTime(total_seconds) {
                function prettyTimeString(num) {
                    return ( num < 10 ? "0" : "" ) + num;
                }

                var seconds, minutes, hours, result;

                hours = Math.floor(total_seconds / 3600);
                total_seconds = total_seconds % 3600;

                minutes = Math.floor(total_seconds / 60);
                total_seconds = total_seconds % 60;

                seconds = Math.floor(total_seconds);

                // Pad the minutes and seconds with leading zeros, if required
                hours = prettyTimeString(hours);
                minutes = prettyTimeString(minutes);
                seconds = prettyTimeString(seconds);

                // Compose the string for display
                result = hours + ":" + minutes + ":" + seconds;

                return result;
            }

            setInterval(function() {
                time++;
                $('#connected').text(elapsedTime(time));
            }, 1000);
        }
    }))();
});
