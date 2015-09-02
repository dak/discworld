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
    'beep',
    'collections/group',
    'collections/history'
],

function ($, _, Backbone, socket, Beep, group, history) {
    'use strict';

    var CAST, TCHANGE, INVIS, CHANGE, VISIBLE, IMPACT, DEVELOP, TBROKE, BROKE;
    var EFF_KNOCK;
    var GROUP_JOIN, GROUP_LEAVE, NO_PROT, PROT;
    var _int;

    CAST = /With a noise that sounds like &quot;Plink\!&quot;, everything around (?:the |a )?(.+) (flashes red) for a moment./;
    TCHANGE = /The (?:\w+ \w+) glow around (?:the |a )?(.+) (?:becomes (\w+ \w+)|disappears)\./;
    INVIS = /(Your) shield stops glowing a (?:\w+ \w+) and lapses back into (invisibility)\./;
    CHANGE = /(Your) shield changes from a (?:\w+ \w+) to a (\w+ \w+)\./;
    VISIBLE = /As (your) shield absorbs the impact, it becomes visible as a (\w+ \w+) glow./;
    IMPACT = /As (your) shield absorbs the impact, its glow changes from a (?:\w+ \w+) to a (\w+ \w+)\./;
    DEVELOP = /A (\w+ \w+) glow (?:develops|appears) around (?:the |a )?(.+)\./;
    TBROKE = /There is a sudden white flash around (?:the |a )?(.+)(\.)/;
    BROKE = /There is a sudden white flash\.  (Your) magical shield has broken(\.)/;

    EFF_KNOCK = /In blocking the attack the (?:.+) floating around you is knocked out of orbit./;

    GROUP_JOIN = /\[(?:.+)\] (.+) has joined the group./;
    GROUP_LEAVE = /\[(?:.+)\] (.+) has left the group./;
    NO_PROT = /(.+) has no arcane protection./;
    PROT = /Arcane protection for (.+):-/;

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

            this.groupHandler(data);
            $output.append(this.highlight(data));
            $output.scrollTop($output.get(0).scrollHeight);
        },

        clear: function () {
            this.$el.find('#output').empty();
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

        groupHandler: function (text) {
            var member;

            //text = this.grg(text);

            if (member = text.match(GROUP_JOIN)) {
                group.add({id: member[1].replace(/<(?:.|\n)*?>/gm, '')});
            } else if (member = text.match(GROUP_LEAVE)) {
                group.remove({id: member[1].replace(/<(?:.|\n)*?>/gm, '')});
            }
        },

        highlight: function (text) {
            text = this.tpa(text);
            text = this.eff(text);

            return text;
        },

        eff: function (text) {
            var eff;

            eff = text.match(EFF_KNOCK);

            if (eff instanceof Array) {
                new Beep(22050).play(900, 1, [Beep.utils.amplify(8000)]);
                return this.colorize(text, eff[0], 'yellow');
            }

            return text;
        },

        tpa: function (text) {
            var tpa, target, color, member, match;

            if (tpa = text.match(DEVELOP)) {
                match = tpa.splice(1,2).reverse();
            } else if (tpa = text.match(CAST) ||
                             text.match(TCHANGE) ||
                             text.match(INVIS) ||
                             text.match(CHANGE) ||
                             text.match(VISIBLE) ||
                             text.match(IMPACT) ||
                             text.match(TBROKE) ||
                             text.match(BROKE))
            {
                match = tpa.splice(1,2);
            } else {
                return text;
            }

            if (match instanceof Array) {
                target = match[0];
                color = match[1];

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
                        new Beep(22050).play(800, 0.3, [Beep.utils.amplify(8000)]);
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
