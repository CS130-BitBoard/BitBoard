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
app.post('/boards', boardRoutes.create);
app.get('/boards/:boardId', boardRoutes.get);

// Holds the current state of each board.
var boardStates = {};
// Key:boardID Value: list of users
var users = {};

io.on('connection', function(socket) {
    var boardId = '';

    socket.on('joinBoard', function(newBoardId, userId) {
        boardId = newBoardId;
        socket.join(boardId);
        if (!users[boardId]) {
            users[boardId] = [];
        }
        if (userId != null) {
            socket.userId = userId;
            users[boardId].push(userId);
        }
        socket.emit('updateChatbox', '', ' you have joined');
        socket.broadcast.to(boardId).emit('updateChatbox', '', ' ' + userId + ' has joined');

        // TODO: remove this
        console.log('users:', users);
        console.log('boardStates:', boardStates);

        // Replay messages to new clients
        if (boardStates[boardId]) {
            var messages = boardStates[boardId];
            for (var i = 0; i < messages.length; i++) {
                var m = messages[i];
                socket.emit(m.type, m.data, m.sessionId);
            }
        } else {
            // We are the first in the room, create an empty state
            boardStates[boardId] = [];
        }
    });

    socket.on('startPath', function(data, sessionId) {
        boardStates[boardId].push(new Message('startPath', data, sessionId));
        socket.broadcast.to(boardId).emit('startPath', data, sessionId);
    });
    socket.on('continuePath', function(data, sessionId) {
        boardStates[boardId].push(new Message('continuePath', data, sessionId));
        socket.broadcast.to(boardId).emit('continuePath', data, sessionId);
    });
    socket.on('clearCanvas', function() {
        boardStates[boardId].length = 0; // Clear the array
        socket.broadcast.to(boardId).emit('clearCanvas');
    });

    socket.on('sendChatMessage', function(message) {
        socket.broadcast.to(boardId).emit('updateChatbox', socket.userId, message);
    });

    socket.on('disconnect', function() {
        if (socket.userId != null) {
            delete users[boardId][users[boardId].indexOf(socket.userId)];
            if (users[boardId].length == 0) {
                delete users.boardId;
            }
            socket.broadcast.to(boardId).emit('updateChatbox', '', socket.userId + ' disconnected');
        }
    });
});

function Message(type, data, id) {
    this.type = type;
    this.data = data;
    this.sessionId = id;
}
