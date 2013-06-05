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

const BEL     = 7;
const LF      = 10;
const CR      = 13;

const BINARY            = 0; // RFC 856
const ECHO              = 1; // RFC 857
const SGA               = 3; // RFC 858
const STATUS            = 5; // RFC 859
const TIMING_MARK       = 6; // RFC 860
const TTYPE             = 24; // RFC 930, 1091, http://tintin.sourceforge.net/mtts/
const OPT_EOR           = 25; // RFC 885
const NAWS              = 31; // RFC 1073 (Negotiate About Window Size)
const TERMINAL_SPEED    = 32; // RFC 1079
const LINE_MODE         = 34; // RFC 1184
const NEW_ENVIRON       = 39; // RFC 1572
const CHARSET           = 42; // RFC 2066
const MSDP              = 69;
const MSSP              = 70; // MUD Server Status Protocol
const MCCPv1            = 85; // MUD Client Compression Protocol (version 1)
const MCCP              = 86; // MUD Client Compression Protocol (version 2) http://www.zuggsoft.com/zmud/mcp.htm
const MSP               = 90; // MUD Sound Protocol http://www.zuggsoft.com/zmud/msp.htm
const MXP               = 91; // MUD eXtension Protocol http://www.zuggsoft.com/zmud/mxp.htm
const ZMP               = 93; // Zenith MUD Protocol http://discworld.starturtle.net/external/protocols/zmp.html
const GCMP              = 201; // Generic Mud Communication Protocol http://www.ironrealms.com/gmcp-doc
const EXOPL             = 255; // RFC 861

const SEND              = 1;
const IS                = 0;

// 120?

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
    var mud, mccp = false, mtts = 0, encoding = 'ascii', timeout;

    mud = net.createConnection(port, host);

    function processData(buf) {
        var last = 0, str, formatted;

        for (var i=0,len=buf.length; i<buf.length; i++) {
            console.log(buf[i] + ' = ' + (buf[i]).toString(16) + ' = ' + String.fromCharCode(buf[i]));
            
            if (13 === buf[i] && 10 === buf[i+1]) {
                //console.log('FIXME: Parse this as a new line and make it a <br />.');
            }

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
                
                if (SE === command) {
                    console.log(buf[i] + ' ' + command);

                    i+=1;
                    last = i+1;

                    return;
                }

                console.log(buf[i] + ' ' + command + ' ' + option);

                if (DO === command && TTYPE === option) {
                    console.log('iac will ttype');
                    mud.write(new Buffer(String.fromCharCode(IAC,WILL,TTYPE), encoding));
                }

                // SB TTYPE SEND IAC SE
                // http://tintin.sourceforge.net/mtts/
                if (SB === command && TTYPE === option && SEND === buf[i+3] && IAC === buf[i+4] && SE === buf[i+5]) {
                    if (0 === mtts) {
                        console.log('IAC SB TTYPE IS CLIENTNAME IAC SE');
                        mtts++;
                        mud.write(new Buffer(String.fromCharCode(IAC,SB,TTYPE,IS)+'DISCWORLD'+String.fromCharCode(IAC,SE), encoding));
                    } else if (1 === mtts) {
                        console.log('iac sb ttype is ansi iac se');
                        mtts++;
                        mud.write(new Buffer(String.fromCharCode(IAC,SB,TTYPE,IS)+'ANSI'+String.fromCharCode(IAC,SE), encoding));
                    } else {
                        console.log('iac sb ttype is mtts 5 iac se');
                        mud.write(new Buffer(String.fromCharCode(IAC,SB,TTYPE,IS)+'MTTS 5'+String.fromCharCode(IAC,SE), encoding));
                        encoding = 'utf8';
                    }
                    
                    i+=5;
                    last = i+1;
                    return;
                }

                if (DONT === command && TTYPE === option) {
                    mtts = 0;
                }

                if (WILL === command && MCCP === option) {
                    console.log('iac do mccp');
                    mud.write(new Buffer(String.fromCharCode(IAC,DO,MCCP), encoding));
                }

                // IAC SB MCCP IAC SE
                if (SB === command && MCCP === option && IAC === buf[i+3] && SE === buf[i+4]) {
                    console.log('server now using deflate');
                    mccp = true;
                    i+=4;
                    last = i+1;
                    return;
                }

                if (DO === command && NAWS === option) {
                    console.log('FIXME: Double any occurance of 255');
                    console.log('FIXME: Get window size from the client');

                    console.log('iac will naws');
                    mud.write(new Buffer(String.fromCharCode(IAC,WILL,NAWS), encoding));

                    console.log('iac sb naws 0 120 0 45 iac se');
                    mud.write(new Buffer(String.fromCharCode(IAC,SB,NAWS)+'0 120 0 45'+String.fromCharCode(IAC,SE), encoding));
                }

                if (WILL === command && MSSP === option) {
                    console.log('iac dont mssp');
                    mud.write(new Buffer(String.fromCharCode(IAC,DONT,MSSP), encoding));
                }

                if (WONT === command && ECHO === option) {
                    console.log('FIXME: start echoing output and turn on history');

                    console.log('iac dont echo');
                    mud.write(new Buffer(String.fromCharCode(IAC,DONT,ECHO,LF,CR), encoding));
                }

                if (WILL === command && ECHO === option) {
                    echo = true;
                    console.log('FIXME: stop echoing output and turn off history');

                    console.log('iac do echo');
                    mud.write(new Buffer(String.fromCharCode(IAC,DO,ECHO), encoding));
                }

                if (WILL === command && ZMP === option) {
                    console.log('FIXME: add zmp support');

                    console.log('iac dont zmp');
                    mud.write(new Buffer(String.fromCharCode(IAC,DONT,ZMP), encoding));
                }
                
                i+=2;
                last = i+1;
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

    inflate.on('end', function() {
        mccp = false;
        console.log('server no longer using deflate');
    });
    
    mud.on('connect', function (data) {
        console.log('FIXME: Tell client connection is established and start timer.');
    });

    mud.on('data', function (data) {
       if (mccp) {
            inflate.write(data);
        } else {
            processData(data);
        }
    });
    
    mud.on('end', function (data) {
        console.log('FIXME: Server ended connection.  Tell client disconnect occurred.');
        console.log('FIXME: Attempt to reconnect immediately, then every 10 seconds.');
        console.log('FIXME: Break out server code into its own function.')
        /*timeout = setInterval(function () {
            console.log('attempt to reconnect');
            mud = net.createConnection(port, host, function() {
                console.log('clear reconnect timeout');
                clearInterval(timeout);
                timeout = null;
            });
        }, 3000);*/
    });

    socket.on('message', function (data) {
        data += '\r\n';

        mud.write(data, encoding);
    });
});

server.listen(4242);
