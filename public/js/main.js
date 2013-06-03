/**
 * This is the first script run by require.js when our application loads.
 *
 * @author Derek Kent <dak@dak.org>
 */
require.config({
    // Setup path aliases
    paths: {
        // Core libraries
        jquery: 'libs/jquery',
        handlebars: 'libs/handlebars/handlebars',
        underscore: 'libs/underscore/lodash',
        backbone: 'libs/backbone/backbone',
        websockets: '//' + location.host + '/socket.io/socket.io',

        // Handlebars extensions
        swag: 'libs/handlebars/swag',

        // Require.js plugins
        text: 'libs/require/plugins/text',

        // Styles directory
        styles: '../styles',

        // Handlebars templates directory
        templates: '../templates'
    },

    map: {
        '*': {
            'css': 'libs/require/plugins/require-css/css',
            'less': 'libs/require/plugins/require-less/less'
        }
    },

    // Sets the configuration for third party scripts that are not AMD compatible
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'handlebars': {
            exports: 'Handlebars'
        },

        'swag': ['handlebars']
    }
});

define(['loader'], function (Loader) {
    Loader.initialize();
});
