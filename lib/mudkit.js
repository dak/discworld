/* MUDKit */
/* Engine to transform a MUD stream to HTML and manage Telnet negotiation. */

var net = require('net'),
    util = require('util'),
    stream = require('stream'),
    zlib = require('zlib');

const CLIENT = 'MUDKIT';

const IAC     = 255; // interpret as command
const DONT    = 254; // you are not to use option
const DO      = 253; // please use option
const WONT    = 252; // I won't use option
const WILL    = 251; // I will use option
const SB      = 250; // sub-negotiation
const GA      = 249; // Go-ahead
const EL      = 248; // Erase line
const EC      = 247; // Erase character
const AYT     = 246; // Are you there?
const AO      = 245; // Abort output (but let prog finish)
const IP      = 244; // Interrupt (permanently)
const BREAK   = 243;
const DM      = 242; // Data mark
const NOP     = 241;
const SE      = 240; // End sub-negotiation
const EOR     = 239; // End of record (transparent mode)
const ABORT   = 238; // Abort process
const SUSP    = 237; // Suspend process
const EOF     = 236; // End of file
const SYNCH   = 242;

const BEL     = 7;
const LF      = 10;
const CR      = 13;

const TELOPT_BINARY            = 0; // RFC 856
const TELOPT_ECHO              = 1; // RFC 857
const TELOPT_SGA               = 3; // RFC 858
const TELOPT_STATUS            = 5; // RFC 859
const TELOPT_TIMING_MARK       = 6; // RFC 860
const TELOPT_TTYPE             = 24; // RFC 930, 1091, http://tintin.sourceforge.net/mtts/
const TELOPT_EOR               = 25; // RFC 885
const TELOPT_NAWS              = 31; // RFC 1073 (Negotiate About Window Size)
const TELOPT_TERMINAL_SPEED    = 32; // RFC 1079
const TELOPT_LINE_MODE         = 34; // RFC 1184
const TELOPT_NEW_ENVIRON       = 39; // RFC 1572
const TELOPT_CHARSET           = 42; // RFC 2066
const TELOPT_MSDP              = 69;
const TELOPT_MSSP              = 70; // MUD Server Status Protocol
const TELOPT_COMPRESS          = 85; // MUD Client Compression Protocol (version 1)
const TELOPT_COMPRESS2         = 86; // MUD Client Compression Protocol (version 2) http://www.zuggsoft.com/zmud/mcp.htm
const TELOPT_MSP               = 90; // MUD Sound Protocol http://www.zuggsoft.com/zmud/msp.htm
const TELOPT_MXP               = 91; // MUD eXtension Protocol http://www.zuggsoft.com/zmud/mxp.htm
const TELOPT_ZMP               = 93; // Zenith MUD Protocol http://discworld.starturtle.net/external/protocols/zmp.html
const TELOPT_GCMP              = 201; // Generic Mud Communication Protocol http://www.ironrealms.com/gmcp-doc
const TELOPT_EXOPL             = 255; // RFC 861

const TELQUAL_SEND             = 1;
const TELQUAL_IS               = 0;

const ANSI_COLOR_START = [27, 91]; // ESC[ (1b 5b)
const ANSI_COLOR_END = 109; // m (6d)
const ANSI_COLOR_DELIM = 59; // ; (3b)
const COLORS = {
    0:  'normal',
    1:  'bold',
    2:  'faint',
    3:  'standout',
    4:  'underline',
    5:  'blink',
    8:  'invisible',
    10: 'normal-bg',
    22: 'normal-weight',
    23: 'no-standout',
    24: 'no-underline',
    25: 'no-blink',
    30: 'black',
    31: 'red',
    32: 'green',
    33: 'yellow',
    34: 'blue',
    35: 'magenta',
    36: 'cyan',
    37: 'white',
    39: 'default',
    40: 'black-bg',
    41: 'red-bg',
    42: 'green-bg',
    43: 'yellow-bg',
    44: 'blue-bg',
    45: 'magenta-bg',
    46: 'cyan-bg',
    47: 'white-bg',
    49: 'default-bg'
};

String.prototype.charCode = function () {
    for (var arr = this.split(''), i = this.length - 1; i >= 0; i--) {
        arr[i] = arr[i].charCodeAt(0);
    }

    return arr;
};

Array.prototype.flatten = function () {
    return this.reduce(function flatten(a, b) {
        if (!(a instanceof Array)) { a = [a]; }

        if (b instanceof Array) {
            b = b.reduce(flatten);
        }

        return a.concat(b);
    }, []);
};

/* A telnet protocol stream.
 * Emits processed data:
 *  'data' -> what the server sent
 *  other  -> telnet protocol command information
 */
function MUDKit (port, host, callback, terminal) {
    var mudkit = this;

    stream.Transform.call(this);

    this.state = {
        mtts: 0,
        mccp: false,
        color: 'normal'
    };

    this.env = {
        terminal: {
            rows: [0, 24],
            cols: [0, 80]
        }
    };

    this.encoding = 'ascii';

    if (terminal) {
        this.windowSize(terminal);
    }

    this.inflate = zlib.createInflate();
    this.inflate.on('data', function (chunk) {
        mudkit.processChunk(chunk);
    });

    port = port || 4242;
    host = host || localhost;
    this.connect(port, host, callback);

    this.mud.on('end', function () {
        // mudkit.unpipe();
        mudkit.connect(port, host, callback);
    });
}
util.inherits(MUDKit, stream.Transform);

MUDKit.prototype._transform = function (chunk, encoding, callback) {
    var err;

    // Decompress the chunk if MCCP is enabled
    if (this.state.mccp) {
        try {
           this.inflate.write(chunk);
        } catch (err) {
           this.processChunk(chunk, encoding);
        }
    } else {
        this.processChunk(chunk, encoding);
    }

    err = this.err;
    this.err = null;

    callback(err);
};

MUDKit.prototype._flush = function (callback) {
    callback();
};

MUDKit.prototype.connect = function (port, host, callback) {
    this.mud = net.createConnection(port, host);

    this.mud.pipe(this);
    this.mud.on('connected', callback);
};

MUDKit.prototype.sendCommand = function (command) {
    var bytes = [IAC];

    if (command instanceof Array) {
        bytes = bytes.concat(command);
    } else {
        bytes.push(command);
    }

    console.log('send: ' + bytes);

    this.mud.write(new Buffer(bytes, this.encoding));
};

MUDKit.prototype.processChunk = function (chunk, encoding) {
    var mudkit = this, i, l, last = 0, remaining = '',
        span = '<span class="' + this.state.color + '">',
        output = '', chunkOutput = [];

    function sliceChunk () {
        return chunk.slice(last, i).toString(this.encoding);
    }

    function processNewLine () {
        output += '<br />';
        i++;
    }

    function process255 () {
        output += String.fromCharCode(255);
        console.log('double 255');
        i++;
    }

    function processANSIColor () {
        var color, classes = '';

        last = ++i + 1;

        while (ANSI_COLOR_END !== chunk[i]) {
            if (undefined === chunk[i]) {
                // Buffer the rest of this chunk and append it to the next chunk
                mudkit.buffer = chunk.slice(last-2, i);
                return;
            }

            i++;
        }

        color = sliceChunk().split(';');

        for (var j = 0, ll = color.length; j < ll; j++) {
            if (COLORS[color[j]]) {
                classes += COLORS[color[j]] + ' ';
            }
        }

        mudkit.state.color = classes;

        if (!classes) { classes = 'normal'; }

        if (output) {
            output += '</span>';
            output = span + output + '</span>';

            chunkOutput.push(output);
            output = '';
        }

        span = '<span class="' + classes + '">';
    }

    function processCommand () {
        var cmd, opt;

        function processSB () {
            var sub, term;

            i++;
            sub = chunk[i];

            switch (sub) {
            case TELOPT_TTYPE:
                console.log('SB TTYPE');
                if (TELQUAL_SEND === chunk[i+1]) {
                    i++;

                    switch (mudkit.state.mtts) {
                    case 0:
                        console.log('SB TTYPE IS MUDKIT');
                        term = CLIENT.charCode();
                        mudkit.state.mtts++;
                        break;
                    case 1:
                        console.log('SB TTYPE IS ANSI');
                        term = 'ANSI'.charCode();
                        mudkit.state.mtts++;
                        break;
                    case 2:
                        console.log('SB TTYPE IS MTTS 5');
                        term = 'MTTS 5'.charCode();
                        mudkit.state.mtts++;
                        break;
                    default:
                        console.log('SB TTYPE IS MTTS 5');
                        term = 'MTTS 5'.charCode();
                        mudkit.state.mtts = 0;
                    }

                    mudkit.sendCommand([SB, TELOPT_TTYPE, TELQUAL_IS, term, IAC, SE].flatten());
                }
                break;

            case TELOPT_COMPRESS2:
                console.log('SB COMPRESS2');
                console.log('server now using deflate');
                mudkit.state.mccp = true;
                break;

            default:
                console.log('Unkown SB command: ' + sub);
            }

            for (; i < l; i++) {
                if (IAC === chunk[i] && SE === chunk[i+1]) {
                    i++;
                    break;
                }
            }
        }

        i++;
        cmd = chunk[i];

        switch (cmd) {
        case GA:
            console.log('GA');
            break;

        case SB:
            processSB();
            break;

        case DO:
            opt = chunk[++i];

            switch (opt) {
            case TELOPT_ECHO:
                console.log('DO ECHO - not implemented');
                break;

            case TELOPT_TTYPE:
                console.log('DO TTYPE');
                mudkit.sendCommand([WILL, TELOPT_TTYPE]);
                break;

            case TELOPT_NAWS:
                console.log('DO NAWS');
                mudkit.sendCommand([WILL, TELOPT_NAWS]);
                mudkit.state.naws = true;
                mudkit.windowSize();
                mudkit.emit('naws');
                break;

            case TELOPT_MXP:
                console.log('DO MXP');
                mudkit.sendCommand([WONT, TELOPT_MXP]);
                break;

            case TELOPT_NEW_ENVIRON:
                console.log('DO NEW_ENVIRON');
                mudkit.sendCommand([WONT, TELOPT_NEW_ENVIRON]);
                break;

            default:
                console.log('Unkown DO telopt: ' + opt);
            }
            break;

        case DONT:
            opt = chunk[++i];

            switch (opt) {
            case TELOPT_ECHO:
                console.log('DONT ECHO - not implemented');
                break;

            case TELOPT_TTYPE:
                console.log('DONT TTYPE');
                mudkit.state.mtts = 0;
                break;

            default:
                console.log('Unkown DONT telopt: ' + opt);
            }
            break;

        case WILL:
            opt = chunk[++i];

            switch (opt) {
            case TELOPT_ECHO:
                console.log('WILL ECHO');
                mudkit.sendCommand([DO,TELOPT_ECHO]);
                break;

            case TELOPT_COMPRESS2:
                console.log('WILL COMPRESS2');
                mudkit.sendCommand([DO, TELOPT_COMPRESS2]);
                break;
            case TELOPT_MSSP:
                console.log('WILL MSSP');
                mudkit.sendCommand([DONT, TELOPT_MSSP]);
                break;
            case TELOPT_ZMP:
                console.log('WILL ZMP');
                mudkit.sendCommand([DONT, TELOPT_ZMP]);
                break;
            case TELOPT_GCMP:
                console.log('WILL GCMP');
                mudkit.sendCommand([DONT, TELOPT_GCMP]);
                break;
            default:
                console.log('Unkown WILL telopt: ' + opt);
            }
            break;

        case WONT:
            opt = chunk[++i];

            switch (opt) {
            case TELOPT_ECHO:
                console.log('WONT ECHO');
                mudkit.sendCommand([DONT,TELOPT_ECHO]);
                break;

            default:
                console.log('Unkown WONT telopt: ' + opt);
            }
            break;

        default:
            console.log('Unkown command: ' + cmd);
        }
    }

    if (!chunk || !chunk.length) { return; }
    if (!Buffer.isBuffer(chunk)) { chunk = new Buffer(chunk, encoding); }

    if (mudkit.buffer) {
        chunk = Buffer.concat([mudkit.buffer, chunk]);
        mudkit.buffer = null;
    }

    for (i = 0, l = chunk.length; i < l; i++) {
        //console.log(i + ': ' + chunk[i] + ' = ' + String.fromCharCode(chunk[i]));
        if (CR === chunk[i] && LF === chunk[i+1]) {
            output += sliceChunk();
            processNewLine();
            last = i + 1;
        } else if (ANSI_COLOR_START[0] === chunk[i] && ANSI_COLOR_START[1] === chunk[i+1]) {
            output += sliceChunk();
            processANSIColor();
            last = i + 1;
        } else if (IAC === chunk[i] && IAC !== chunk[i+1]) {
            output += sliceChunk();
            processCommand();
            last = i + 1;
        } else if (IAC === chunk[i] && IAC === chunk[i+1]) {
            output += sliceChunk();
            process255();
            last = i + 1;
        } /*else if () {
            // handle encoding characters for html
            function htmlEscape(str) {
                return String(str)
                    .replace(/&/g, '&amp;') // 38
                    .replace(/"/g, '&quot;') // 34
                    .replace(/'/g, '&#39;') // 39
                    .replace(/</g, '&lt;') // 60
                    .replace(/>/g, '&gt;'); // 62
            }
        }*/
    }
    
    // If the last character is an ESC, append it to the next chunk
    if (ANSI_COLOR_START[0] === chunk[chunk.length-1]) {
        mudkit.buffer = chunk.slice(chunk.length-1);
        chunk = chunk.slice(0, chunk.length-1);
    }

    if (i > last) {
        remaining = sliceChunk();

        if (1 === remaining.length && 255 === remaining[0]) {
            // What is this?
            remaining = '';
        }
    }

    output += remaining;

    if (output) {
        output = span + output + '</span>';
        chunkOutput.push(output);

        output = '';
    }

    for (i = 0, l = chunkOutput.length; i < l; i++) {
        output += chunkOutput[i];
    }

    this.push(output);
};

MUDKit.prototype.windowSize = function (size) {
    const MAX = 65535;
    var cols, rows;

    function convert(num) {
        if (255 === num) { num = [255, 255]; }
        return num;
    }

    function first(num) {
        return convert(Math.floor(num / 256));
    }

    function second(num) {
        return convert(num % 256);
    }

    if (size) {
        if (size.cols > MAX) { size.cols = MAX; }
        if (size.rows > MAX) { size.rows = MAX; }

        cols = [first(size.cols), second(size.cols)].flatten();
        rows = [first(size.rows), second(size.rows)].flatten();

        this.env.terminal = {
            cols: cols,
            rows: rows
        };
    }

    if (this.state.naws) {
        this.sendCommand([SB, TELOPT_NAWS, this.env.terminal.cols, this.env.terminal.rows, IAC, SE].flatten());
    }
};

module.exports = MUDKit;
