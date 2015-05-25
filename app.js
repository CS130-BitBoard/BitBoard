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

//Holds the current state of each board.
var board_state = {};
//Key:boardID Value: list of users
var users = {};

io.on('connection', function(socket) {
    var boardId = '';

    socket.on('joinBoard', function(boardid, userid) {
        boardId = boardid;
        socket.join(boardId);
        console.log('BoardId: ', boardid);
        if (!users[boardid]) {
            users[boardid] = [];
        }
        if (userid != null) {
            socket.userid = userid;
            users[boardid].push(userid);
        }
        socket.emit('updatechatbox', '', ' you have joined');
        socket.broadcast.to(boardId).emit('updatechatbox', '', ' ' + userid + ' has joined');

        console.log(users);
        //Replay messages to new clients
        if (board_state[boardId]) {
            var messages = board_state[boardId];
            for (var i = 0; i < messages.length; i++) {
                var m = messages[i];
                socket.emit(m.type, m.data, m.sessionId);
            }
        } else {
            // We are the first in the room, create an empty state
            board_state[boardId] = [];
        }
    });

    socket.on('startPath', function(data, sessionId) {
        board_state[boardId].push(new Message('startPath', data, sessionId));
        socket.broadcast.to(boardId).emit('startPath', data, sessionId);
    });
    socket.on('continuePath', function(data, sessionId) {
        board_state[boardId].push(new Message('continuePath', data, sessionId));
        socket.broadcast.to(boardId).emit('continuePath', data, sessionId);
    });
    socket.on('clearCanvas', function() {
        board_state[boardId].length = 0; //Clear the array
        socket.broadcast.to(boardId).emit('clearCanvas');
    });

    socket.on('sendchatmessage', function(data) {
        socket.emit('updatechatbox', socket.userid, data);
        socket.broadcast.to(boardId).emit('updatechatbox', socket.userid, data);
    });

    socket.on('disconnect', function() {
        if (socket.userid != null) {
            delete users[boardId][users[boardId].indexOf(socket.userid)];
            if (users[boardId].length == 0) {
                delete users.boardId;
            }
            socket.broadcast.to(boardId).emit('updatechatbox', '', socket.userid + ' disconnected');
        }
    });
});

function Message(type, data, id) {
    this.type = type;
    this.data = data;
    this.sessionId = id;
}
