/**
 * Input view.
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

    var ENTER = 13,
        UP = 38,
        DOWN = 40;

    return new (Backbone.View.extend({
        initialize: function() {
            this.listenTo(history, 'add', this.update);
        },

        events: {
            'keyup input': 'keyup'
        },

        update: function () {
            var $input = this.$el.find('input');

            $input.val(history.last().get('text'));
            $input.select();
        },

        keyup: function (e) {
            var $input = this.$el.find('input');

            if (ENTER === e.keyCode) {
                socket.emit('message', $input.val());
                history.add({text: $input.val()});
                $input.select();
            } else if (UP === e.keyCode) {
                $input.val(history.previous().get('text'));
                $input.select();
            } else if (DOWN === e.keyCode) {
                $input.val(history.next().get('text'));
                $input.select();
            } else {
                history.resetCurrent();
            }
        }
    }))();
});
