/**
 * Output view.
 *
 * @author Derek Kent <dak@dak.org>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'socket',
    'collections/group',
    'collections/history'
],

function ($, _, Backbone, socket, group, history) {
    'use strict';

    var _int;

    return new (Backbone.View.extend({
        initialize: function () {
            var view = this;

            this.listenTo(history, 'add add:newline', this.echo);

            socket.on('message', function(message) {
                if ('update' === message.command) {
                    view.update(message.data);
                }
            });

            socket.on('naws', function() {
                view.resize();
            });

            $(window).resize(this.resize);
        },

        resize: function () {
            var cols, rows;

            rows = Math.floor($('#output').height() / parseInt($('#output').css('line-height'), 10));

            $('#output').append('<span id="char" style="visibility: hidden; pointer-events: none; position: absolute;">M</span>');
            cols = Math.floor($('#output').width() / ($('#char').width()+1));
            $('#char').remove();

            // Clear the timeout if we resize again
            if (_int) {
                clearTimeout(_int);
            }

            // Wait 2 seconds after resize to prevent spamming the server
            _int = setTimeout(function () {
                socket.emit('terminal', {cols: cols, rows: rows});
            }, 2000);
        },

        update: function (data) {
            var $output = this.$el.find('#output');

            $output.append(this.highlight(data));
            $output.scrollTop($output.get(0).scrollHeight);
        },

        echo: function () {
            var data, text, last = history.last();

            if (last) {
                text = last.get('text');
            } else {
                text = '';
            }

            data = '<br /><span class="self">&gt; ' + text + '</span><br />';

            this.update(data);
        },

        highlight: function (text) {
            text = this.tpa(text);
            text = this.eff(text);
            //text = this.grg(text);

            return text;
        },

        eff: function (text) {
            var eff;

            eff = text.match(/In blocking the attack the (?:.+) floating around you is knocked out of orbit./);

            if (eff instanceof Array) {
                return this.colorize(text, eff[0], 'yellow');
            }

            return text;
        },

        tpa: function (text) {
            var tpa, target, color, member;

            tpa = text.match(/The (?:\w+ \w+) glow around (?:the |a )?(.+) (?:becomes (\w+ \w+)|disappears)\./) ||
                  text.match(/(Your) shield stops glowing a (?:\w+ \w+) and lapses back into (invisibility)\./) ||
                  text.match(/As (your) shield absorbs the impact, it becomes visible as a (\w+ \w+) glow./) ||
                  text.match(/There is a sudden white flash around (?:the |a )?(.+)(\.)/);

            if (tpa instanceof Array) {
                target = tpa[1];
                color = tpa[2];

                if (target === 'your' || target === 'Your' || target === 'you') {
                    target = 'Me';
                }

                member = group.get(target);

                switch (color) {
                    case 'dull red':
                        text = this.colorize(text, tpa[0], 'salmon');
                        if (member) { member.set('tpa', 'salmon'); }
                        break;
                    case 'bright red':
                        text = this.colorize(text, tpa[0], 'red');
                        if (member) { member.set('tpa', 'red'); }
                        break;
                    case 'wobbling orange':
                        text = this.colorize(text, tpa[0], 'orange');
                        if (member) { member.set('tpa', 'orange'); }
                        break;
                    case 'flickering yellow':
                        text = this.colorize(text, tpa[0], 'yellow');
                        if (member) { member.set('tpa', 'yellow'); }
                        break;
                    case '.': // Shield broke
                        text = this.colorize(text, tpa[0], 'yellow');
                        if (member) { member.set('tpa', 'black'); }
                        // BEEP!
                        break;
                    default:
                        text = this.colorize(text, tpa[0], 'lightskyblue');
                        if (member) { member.set('tpa', 'green'); }
                        break;
                }
            }

            return text;
        },

        colorize: function (text, str, color) {
            return text.replace(str, '<span style="color: ' + color + ';">' + str + '</span>');
        }
    }))();
});
