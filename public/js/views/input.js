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
    'collections/history',
    'collections/group'
],

function ($, _, Backbone, socket, history, group) {
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
            var $input = this.$el.find('input'),
                last = history.last();

            if (last) {
                $input.val(last.get('text'));
                $input.select();
            }
        },

        processCommand: function(command) {
            var words = command.split(' ');

            switch (words[0]) {
            case 'group':
                if (words[1] === 'add' && words[2]) {
                    group.add({id: words[2]});
                } else if (words[1] === 'remove' && words[2]) {
                    group.remove({id: words[2]});
                }
            }
        },

        keyup: function (e) {
            var $input = this.$el.find('input'), input;

            if (ENTER === e.keyCode) {
                input = $input.val();

                if (input.charAt(0) === '/') {
                    this.processCommand(input.substr(1));
                } else {
                    socket.emit('message', input);
                }

                history.add({text: input});
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
