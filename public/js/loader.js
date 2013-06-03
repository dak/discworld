/**
 * Application loader.  Called by main.js.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'underscore',
    'backbone'
],

function (_, Backbone) {
    'use strict';

    var initialize = function () {
        function setup(router) {
            Backbone.history.start({
                pushState: false
            });

            // Catch internal application links and let Backbone handle the routing
            $(document).on('click', 'a:not([data-bypass])', function (e) {
                var external = new RegExp('^((f|ht)tps?:)?//'),
                    href = $(this).attr('href');

                e.preventDefault();

                if (external.test(href)) {
                    window.open(href, '_blank');
                } else {
                    router.navigate(href, {
                        trigger: true
                    });
                }
            });
        }

        require(['router'], function (router) {
            setup(router);
        });
    };

    return {
        initialize: initialize
    };
});
