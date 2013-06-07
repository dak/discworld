var http = require('http'),
    express = require('express');

var MUDKit = require('./lib/mudkit');

// const HOST = 'dwclone.starturtle.net';
const HOST = 'discworld.starturtle.net';
const PORT = 4242;

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
    var mudkit = new MUDKit(PORT, HOST, function () {
        console.log('Connected');
    });
    
    mudkit.on('data', function(data) {
        socket.emit('message', { command: 'update', data: data.toString() });
    });
    
    mudkit.on('naws', function() {
        console.log('mudkit on naws');
        socket.emit('naws');
    });

    socket.on('message', function (data) {
        mudkit.mud.write(data + '\r\n', mudkit.encoding);
    });
    
    socket.on('terminal', function (size) {
        mudkit.windowSize(size);
    });
});

server.listen(4242);
