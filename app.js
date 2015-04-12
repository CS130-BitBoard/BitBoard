

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon('./node_modules/express/node_modules/connect/node_modules/static-favicon/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);

var server = http.createServer(app).listen(app.get('port'));
var io= require('socket.io').listen(server, function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var usernames = {};

io.sockets.on('connection', function(socket) {
    socket.on( 'startPath', function( data, sessionId ) {
        socket.broadcast.emit( 'startPath', data, sessionId );

    });
    socket.on( 'continuePath', function( data, sessionId ) {
        socket.broadcast.emit( 'continuePath', data, sessionId );

    });
    socket.on('clearCanvas', function() {
    	socket.broadcast.emit('clearCanvas');
    });
    socket.on('disconnect', function() {
    	delete usernames[socket.username];
    	socket.broadcast.emit('', '', socket.username+ ' disconnected');
    });

});




