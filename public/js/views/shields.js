/**
 * Shields view.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'handlebars',
    'socket',
    'collections/group',
    'collections/history',
    'text!templates/shields.html'
],

function ($, _, Backbone, Handlebars, socket, group, history, template) {
    'use strict';

    return new (Backbone.View.extend({
        initialize: function () {
            this.template = Handlebars.compile(template);

            this.listenTo(group, 'change add remove', this.render);

            window.group = group; // TODO: Remove this
        },

        render: function () {
            this.$el.html(this.template({
                members: group.toJSON()
            }));
        },

        events: {
            'click .shield': 'shield'
        },

        shield: function (e) {
            var name = $(e.currentTarget).text().trim(), command;

            if (name === 'skeleton warrior') {
                name = 'my skeleton warrior 1';
            }

            command = 'cast Transcendent Pneumatic Alleviator at ' + name;

            history.add({text: command});
            socket.emit('message', command);
        }
    }))();
});
