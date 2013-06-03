/**
 * Primary application view that manages loading all page views and loads the header on init.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'views/header',
    'views/output',
    'views/input',
    'views/shields',
    'text!templates/main.html',
    'less!styles/main'
],

function ($, _, Backbone, header, output, input, shields, template) {
    'use strict';

    return new (Backbone.View.extend({
        el: 'body',

        render: function () {
            this.$el.html(template);

            header.setElement($('header')).render();
            output.setElement($('#client')).render();
            input.setElement($('#input')).render();
            shields.setElement($('#shields')).render();
        }
    }))();
});
