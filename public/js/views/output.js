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
    var EFF_KNOCK, EFF_FLOAT;
    var GROUP_JOIN, GROUP_LEAVE, NO_PROT, PROT;
    var _int;

    CAST = /With a noise that sounds like &quot;Plink\!&quot;, everything around (?:the |a )?(.+) (flashes red) for a moment\./;
    TCHANGE = /The (?:\w+ \w+) glow around (?:the |a )?(.+) (?:becomes (\w+ \w+)|disappears)\./;
    INVIS = /(Your) shield stops glowing a (?:\w+ \w+) and lapses back into (invisibility)\./;
    CHANGE = /(Your) shield changes from a (?:\w+ \w+) to a (\w+ \w+)\./;
    VISIBLE = /As (your) shield absorbs the impact, it becomes visible as a (\w+ \w+) glow./;
    IMPACT = /As (your) shield absorbs the impact, its glow changes from a (?:\w+ \w+) to a (\w+ \w+)\./;
    DEVELOP = /A (\w+ \w+) glow (?:develops|appears) around (?:the |a )?(.+)\./;
    TBROKE = /There is a sudden white flash around (?:the |a )?(.+)(\.)/;
    BROKE = /There is a sudden white flash\.  (Your) magical shield has broken(\.)/;

    EFF_KNOCK = /In blocking the attack the (?:.+) floating around (you) is knocked out of orbit\./;
    EFF_FLOAT = /The (?:.+) begins to float around (you)\./

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
            window.onmouseup = this.onMouseUp.bind(this);
            window.onmousemove = this.onMouseMove.bind(this);
        },

        events: {
            'mousedown #divider': 'onDividerMouseDown'
        },

        onDividerMouseDown: function () {
            this.dividerMouseDown = true;
        },

        onMouseUp: function () {
            this.dividerMouseDown = false;
        },

        onMouseMove: function (e) {
            var sb = document.getElementById('scrollback'),
                op = document.getElementById('output'),
                height;

            if (this.dividerMouseDown) {
                height = e.clientY - sb.offsetTop;

                if (height < 0) { height = 0; }

                sb.style.height = height + 'px';
                $('#scrollback').scrollTop(sb.scrollHeight);
                $('#output').scrollTop(op.scrollHeight);
                window.getSelection().removeAllRanges();
            }
        },

        resize: function () {
            var cols, rows;

            rows = Math.floor($('#output').height() / parseFloat($('#output').css('line-height')));
            rows--;

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
            var $output = this.$el.find('#output'),
                $scrollback = this.$el.find('#scrollback'),
                text;

            this.groupHandler(data);
            text = this.highlight(data);
            $output.append(text);
            $scrollback.append(text);
            $output.scrollTop(document.getElementById('output').scrollHeight);
        },

        clear: function () {
            this.$el.find('#output')[0].innerHTML = '';
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
                group.get('Me').set('floater', false);
                new Beep(22050).play(900, 1, [Beep.utils.amplify(8000)]);
                return this.colorize(text, eff[0], 'yellow');
            } else {
                eff = text.match(EFF_FLOAT);

                if (eff instanceof Array) {
                    group.get('Me').set('floater', true);
                    return this.colorize(text, eff[0], 'lightskyblue');
                }
            }

            return text;
        },

        tpa: function (text) {
            var tpa, target, color, member, match, stripped;

            stripped = text.replace(/<br \/>/gm, ' ').replace(/<(?:.|\n)*?>/gm, '');
            if (tpa = stripped.match(DEVELOP)) {
                match = tpa.splice(1,2).reverse();
            } else if (tpa = stripped.match(CAST) ||
                             stripped.match(TCHANGE) ||
                             stripped.match(INVIS) ||
                             stripped.match(CHANGE) ||
                             stripped.match(VISIBLE) ||
                             stripped.match(IMPACT) ||
                             stripped.match(TBROKE) ||
                             stripped.match(BROKE))
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

                if (target !== 'skeleton warrior') {
                    target = target.split(' ').slice(0, 1)[0];
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
