/**
 * Output view.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'socket',
    'collections/history'
],

function ($, _, Backbone, socket, history) {
    'use strict';

    var _int;

    return new (Backbone.View.extend({
        initialize: function () {
            var view = this;

            this.listenTo(history, 'add add:newline', this.echo);

            socket.on('message', function(message) {
                if ('update' === message.command) {
                    view.update(message.data)
                }
            });

            socket.on('naws', function() {
                view.resize();
            });

            $(window).resize(this.resize);
        },

        resize: function () {
            var cols, rows;

            rows = Math.floor($('#output').height() / parseInt($('#output').css('line-height'), 10));

            $('#output').append('<span id="char" style="visibility: hidden; pointer-events: none; position: absolute;">M</span>');
            cols = Math.floor($('#output').width() / $('#char').width());
            $('#char').remove();

            // Clear the timeout if we resize again
            if (_int) {
                clearTimeout(_int);
            }

            // Wait 2 seconds after resize to prevent spamming the server
            _int = setTimeout(function () {
                socket.emit('terminal', {cols: cols, rows: rows});
            }, 2000);
        },

        update: function (data) {
            var $output = this.$el.find('#output');

            $output.append(data);
            $output.scrollTop($output.get(0).scrollHeight);
        },

        echo: function () {
            var data, text, last = history.last();

            if (last) {
                text = last.get('text');
            } else {
                text = '';
            }

            data = '<br /><span class="self">&gt; ' + text + '</span><br />';

            this.update(data);
        }
    }))();
});
