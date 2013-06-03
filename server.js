var net = require('net'),
    http = require('http'),
    express = require('express');

var formatter = require('./lib/formatter');

var app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

app.configure(function() {
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function(socket) {
    var mud = net.createConnection(4242, 'discworld.atuin.net');
    mud.setEncoding('utf8');

    mud.addListener('data', function(data) {
        var formatted = formatter.go(data);

        socket.emit('message', { command: 'update', data: formatted });
    });

  socket.on('message', function(data) {
      mud.write(data + '\r\n');
  });
});

server.listen(4242);
