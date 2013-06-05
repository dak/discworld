/**
 * History collection.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'models/command'
],

function ($, _, Backbone, Command) {
    'use strict';

    return new (Backbone.Collection.extend({
        model: Command,

        current: 0,

        add: function (models, options) {
            var i, l, model;

            if (!_.isArray(models)) models = models ? [models] : [];

            this.resetCurrent();

            // Don't add the command if it's blank
            for (i = 0, l = models.length; i < l; i++) {
                if (!models[i].text) {
                    model = models.splice(i, 1)[0];
                    this.trigger('add:newline', model, this, options);
                }
            }

            return Backbone.Collection.prototype.add.call(this, models, options);
        },

        next: function () {
            return this.at(++this.current) || this.at(--this.current);
        },

        previous: function () {
            return this.at(--this.current) || this.at(++this.current);
        },

        last: function () {
            return this.at(this.current);
        },

        resetCurrent: function () {
            this.current = this.length;
        }
    }))();
});
