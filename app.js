var express = require('express'),
    http = require('http'),
    session = require('express-session');

var bitboard_server_init = function() {
    var app = express();
    var server = app.listen(3000);
    var io = require('socket.io').listen(server);

    app.configure(function() {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.use(express.logger('dev'));
        app.use(express.static(__dirname + '/public'));
        app.use(express.bodyParser()); // Do not remove this line to hide deprecation warnings. It is necessary.
        app.use(session({
            secret: 'hunter2',
            resave: false,
            saveUninitialized: true
        }));
        app.use(app.router);
    });

    app.configure('development', function() {
        app.use(express.errorHandler());
    });

    // Dictionary of boards. key: boardId, value: Board
    var boards = {};

    var indexRoutes = require('./routes');
    var boardRoutes = require('./routes/board')(boards);

    app.get('/', indexRoutes.index);
    app.post('/boards', boardRoutes.create);
    app.post('/boards/join', boardRoutes.join);
    app.get('/boards/:boardId', boardRoutes.get);
    app.get('/boards-mobile/:boardId', boardRoutes.get_Mobile);

    function StateMessage(type, data, id) {
        this.type = type;
        this.data = data;
        this.sessionId = id;
    }

    io.on('connection', function(socket) {
        var boardId = '';

        socket.on('joinBoard', function(newBoardId, userId) {
            boardId = newBoardId;

            if (!boardId || !boards[boardId] || !userId) {
                // TODO more gracefully do this
                console.log('bad input')
                return;
            }

            socket.join(boardId);
            socket.userId = userId;

            socket.emit('updateChatbox', '', ' you have joined');
            socket.broadcast.to(boardId).emit('updateChatbox', '', ' ' + userId + ' has joined');

            // Replay messages to new clients
            boards[boardId].stateMessages.forEach(function(sm) {
                socket.emit(sm.type, sm.data, sm.sessionId);
            });
        });

        socket.on('startPath', function(data, sessionId) {
            boards[boardId].stateMessages.push(new StateMessage('startPath', data, sessionId));
            socket.broadcast.to(boardId).emit('startPath', data, sessionId);
        });
        socket.on('continuePath', function(data, sessionId) {
            boards[boardId].stateMessages.push(new StateMessage('continuePath', data, sessionId));
            socket.broadcast.to(boardId).emit('continuePath', data, sessionId);
        });
        socket.on('clearCanvas', function() {
            boards[boardId].stateMessages = [];
            socket.broadcast.to(boardId).emit('clearCanvas');
        });

        socket.on('sendChatMessage', function(message) {
            socket.broadcast.to(boardId).emit('updateChatbox', socket.userId, message);
        });

        socket.on('disconnect', function() {
            if (socket.userId != null) {
                socket.broadcast.to(boardId).emit('updateChatbox', '', socket.userId + ' disconnected');
            }
        });
    });

    return server;
}

module.exports = bitboard_server_init;

// Creates the server when run from the command line
if (!module.parent) {
    bitboard_server_init();
}

