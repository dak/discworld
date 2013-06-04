var net = require('net'),
    http = require('http'),
    express = require('express'),
    zlib = require('zlib'),
    stream = require('stream');

var formatter = require('./lib/formatter');

const host = 'discworld.starturtle.net';
const port = 4242;

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

const BINARY            = 0; // RFC 856
const ECHO              = 1; // RFC 857
const SUPPRESS_GO_AHEAD = 3; // RFC 858
const STATUS            = 5; // RFC 859
const TIMING_MARK       = 6; // RFC 860
const TTYPE             = 24; // RFC 930, 1091, http://tintin.sourceforge.net/mtts/
const NAWS              = 31; // RFC 1073 (Negotiate About Window Size)
const TERMINAL_SPEED    = 32;
const LINE_MODE         = 34; // RFC 1184
const NEW_ENVIRON       = 39; // RFC 1572
const MSDP              = 69;
const MSSP              = 70;
const MCCP              = 86; // http://www.zuggsoft.com/zmud/mcp.htm
const MXP               = 91;
const EXOPL             = 255; // RFC 861

const SEND              = 1;
const IS                = 0;

// 120? 93?

var app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

io.configure('development', function () {
    io.set('log level', 1);
    io.set('transports', ['websocket']);
});

app.configure(function () {
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function (socket) {
    var mud, mccp = false, mtts = 0, encoding = 'ascii';

    mud = net.createConnection(port, host, function () {
        console.log('FIXME: Tell client connection is established and start timer.');
    });

    function processData(buf) {
        var last = 0, str, formatted;

        for (var i=0,len=buf.length; i<buf.length; i++) {
            //console.log(buf[i] + ' = ' + (buf[i]).toString(16) + ' = ' + String.fromCharCode(buf[i]));

            if (IAC === buf[i]) {
                var command = buf[i+1],
                    option = buf[i+2];

                str = buf.slice(last, i).toString(encoding);
                formatted = formatter.go(str);
                socket.emit('message', { command: 'update', data: formatted });

                if (GA === command) {
                    console.log(buf[i] + ' ' + command);

                    i+=1;
                    last = i+1;

                    return;
                }

                console.log(buf[i] + ' ' + command + ' ' + option);

                i+=2;
                last = i+1;

                if (DO === command && TTYPE === option) {
                    console.log('iac will ttype');
                    mud.write(new Buffer(String.fromCharCode(IAC,WILL,TTYPE), encoding));
                }

                // SB TTYPE SEND IAC SE
                // http://tintin.sourceforge.net/mtts/
                if (SB === command && TTYPE === option && SEND === buf[i+1] && IAC === buf[i+2] && SE === buf[i+3]) {
                    if (0 === mtts) {
                        console.log('iac sb ttype is "discworld" iac se');
                        mud.write(new Buffer(String.fromCharCode(IAC,SB,TTYPE,IS)+'"DISCWORLD"'+String.fromCharCode(IAC,SE), encoding));
                        mtts++;
                    } else if (1 === mtts) {
                        console.log('iac sb ttype is "ansi" iac se');
                        mud.write(new Buffer(String.fromCharCode(IAC,SB,TTYPE,IS)+'"ANSI"'+String.fromCharCode(IAC,SE), encoding));
                        mtts++;
                    } else {
                        console.log('iac sb ttype is "ansi" iac se');
                        mud.write(new Buffer(String.fromCharCode(IAC,SB,TTYPE,IS)+'"MTTS 5"'+String.fromCharCode(IAC,SE), encoding));
                        encoding = 'utf8';
                    }
                }

                if (DONT === command && TTYPE === option) {
                    mtts = 0;
                }

                if (WILL === command && MCCP === option) {
                    console.log('iac do mccp');
                    mud.write(new Buffer(String.fromCharCode(IAC,DO,MCCP), encoding));
                }

                // IAC SB MCCP IAC SE
                if (SB === command && MCCP === option && IAC === buf[i+1] && SE === buf[i+2]) {
                    console.log('server now using deflate');
                    mccp = true;
                    i+=2;
                    last = i+1;
                }

                if (DO === command && NAWS === option) {
                    console.log('FIXME: Double any occurance of 255');
                    console.log('FIXME: Get window size from the client');

                    console.log('iac will naws');
                    mud.write(new Buffer(String.fromCharCode(IAC,WILL,NAWS), encoding));

                    console.log('iac sb naws 0 120 0 40 iac se');
                    mud.write(new Buffer(String.fromCharCode(IAC,SB,NAWS)+'0 120 0 40'+String.fromCharCode(IAC,SE), encoding));
                }

                if (WILL === command && MSSP === option) {
                    console.log('iac dont mssp');
                    mud.write(new Buffer(String.fromCharCode(IAC,DONT,MSSP), encoding));
                }

                if (WONT === command && ECHO === option) {
                    console.log('FIXME: start echoing output and turn on history');

                    console.log('iac dont echo');
                    mud.write(new Buffer(String.fromCharCode(IAC,DONT,ECHO), encoding));
                }

                if (WILL === command && ECHO === option) {
                    console.log('FIXME: stop echoing output and turn off history');

                    console.log('iac do echo');
                    mud.write(new Buffer(String.fromCharCode(IAC,DO,ECHO), encoding));
                }
            }
        }

        str = buf.slice(last, buf.length).toString('ascii');
        if (str.length) {
            formatted = formatter.go(str);
            socket.emit('message', { command: 'update', data: formatted });
        }
    }

    var inflate = zlib.createInflate();

    inflate.on('data', function(data) {
        processData(data);
    });

    mud.on('data', function (data) {
       if (mccp) {
            inflate.write(data);
        } else {
            processData(data);
        }
    });

    socket.on('message', function (data) {
        data += '\r\n';

        mud.write(data, encoding);
    });
});

server.listen(4242);
