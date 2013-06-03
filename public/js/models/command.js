/**
 * Command model.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'underscore',
    'backbone'
],

function (_, Backbone) {
    return Backbone.Model.extend({
        defaults: {
            text: ''
        }
    });
});
