/**
 * Group collection.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'models/member'
],

function ($, _, Backbone, Member) {
    'use strict';

    return new (Backbone.Collection.extend({
        model: Member,

        initialize: function() {
            this.add({
                id: 'Me',
                name: 'Junquan',
                floater: true,
                tpa: 'green'
            });
        }
    }))();
});
