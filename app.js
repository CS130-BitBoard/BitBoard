var express = require('express'),
    http = require('http');

var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

var indexRoutes = require('./routes');
var boardRoutes = require('./routes/board');

app.get('/', indexRoutes.index);
app.get('/boards/:boardId', boardRoutes.get);

io.sockets.on('connection', function(socket) {
    socket.on('startPath', function(data, sessionId) {
        socket.broadcast.emit('startPath', data, sessionId);
    });
    socket.on('continuePath', function(data, sessionId) {
        socket.broadcast.emit('continuePath', data, sessionId);
    });
    socket.on('clearCanvas', function() {
        socket.broadcast.emit('clearCanvas');
    });
});
