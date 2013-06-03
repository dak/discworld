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

        add: function () {
            this.resetCurrent();
            return Backbone.Collection.prototype.add.apply(this, arguments);
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
