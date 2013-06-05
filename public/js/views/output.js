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

    return new (Backbone.View.extend({
        initialize: function () {
            var view = this;

            this.listenTo(history, 'add add:newline', this.echo);

            socket.on('message', function(message) {
                if ('update' === message.command) {
                    view.update(message.data)
                }
            });
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
