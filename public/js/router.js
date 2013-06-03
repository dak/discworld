/**
 * Router to manage all navigation in the application.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'views/app'
],

function ($, _, Backbone, appView) {
    'use strict';

    return new (Backbone.Router.extend({
        routes: {
            '': 'client',

            // Default Route
            '*actions': 'client'
        },

        client: function () {
            appView.render();
        }
    }))();
});
