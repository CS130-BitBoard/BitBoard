var express = require('express'),
    http = require('http'),
    session = require('express-session');

/*
 * Spawns a Bitboard server
 * Returns: A server object
 */
var bitboard_server_init = function() {
    var app = express();
    var server = app.listen(3000);
    var io = require('socket.io').listen(server);

    //Basic server configuration
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

    //Defines the structure of the application
    var indexRoutes = require('./routes');
    var boardRoutes = require('./routes/board')(boards);

    app.get('/', indexRoutes.index);
    app.post('/boards', boardRoutes.create);
    app.post('/boards/join', boardRoutes.join);
    app.get('/boards/:boardId', boardRoutes.get);
    app.get('/boards-mobile/:boardId', boardRoutes.get_Mobile);

    //Holds a single message broadcast by a client
    function StateMessage(type, data, id) {
        this.type = type;
        this.data = data;
        this.sessionId = id;
    }

    //Called when a new client joins.
    //The functions defined within control the server's communication with that client.
    //The server just keeps a log of each message sent and hendles relaying a client's 
    //messages to all the other clients on that board.
    io.on('connection', function(socket) {
        var boardId = '';

        //Initial setup of the board state for a new user
        //Replays all the messages the server received before the client joined
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

        //These just relay messages to all clients connected to the board.
        socket.on('startPath', function(data, sessionId) {
            boards[boardId].stateMessages.push(new StateMessage('startPath', data, sessionId));
            socket.broadcast.to(boardId).emit('startPath', data, sessionId);
        });

        socket.on('continuePath', function(data, sessionId) {
            boards[boardId].stateMessages.push(new StateMessage('continuePath', data, sessionId));
            socket.broadcast.to(boardId).emit('continuePath', data, sessionId);
        });

        socket.on('insertText', function(data, sessionId) {
            boards[boardId].stateMessages.push(new StateMessage('insertText', data, sessionId));
            socket.broadcast.to(boardId).emit('insertText', data, sessionId);
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

//We export the server as a module so it can used inside the test framework.
module.exports = bitboard_server_init;

// Creates the server when run from the command line
if (!module.parent) {
    bitboard_server_init();
}

