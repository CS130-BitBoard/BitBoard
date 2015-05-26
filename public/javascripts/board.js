function Canvas() {
    var paths = {};

    this.clear = function() {
        project.activeLayer.removeChildren();
        view.draw();
    };

    this.startPath = function(data, sessionId) {
        paths[sessionId] = new Path();
        paths[sessionId].strokeColor = data.color;
        paths[sessionId].add(new Point(data.point.x, data.point.y));
        view.draw();
    };

    this.continuePath = function(data, sessionId) {
        var path = paths[sessionId];
        if (data.tool === 'tool1') {
            path.add(new Point(data.point.x, data.point.y));
        }
        view.draw();
    };

    this.insertText = function(data, sessionId) {
        if (data.tool === 'tool2') {
            var text = new PointText(new Point(data.point.x, data.point.y));
            text.justification = 'left';
            text.fillColor = 'black';
            text.size = 20;
            text.content = window.prompt("Please enter some text:");
            console.log('printed');
        }
    }
}

function Chatbox($chatContainer, socket, userId) {
    var postStatusMessage = function(message) {
        $chatContainer.find('.chat').append('<span class="status-message">' + message + '</span><br>');
    };

    var postUserMessage = function(userId, message) {
        $chatContainer.find('.chat').append('<b>' + userId + ' :</b> ' + message + '<br>');
    };

    this.postMessage = function(userId, message) {
        if (!userId) {
            postStatusMessage(message);
        } else {
            postUserMessage(userId, message);
        }
    };

    this.sendCurrentMessage = function() {
        var message = $chatContainer.find('#current-message').val();
        $chatContainer.find('#current-message').val('');
        postUserMessage(userId, message);
        socket.emit('sendChatMessage', message);
    };
}

$(document).ready(function() {
    $("#colorPicker").spectrum({
      color: "#000",
      showAlpha: true,
      showPalette: true
    });

    var sessionId;
    var boardId = $('#board-id').data('value');
    var userId = $('#user-id').data('value');

    var socket = io.connect('/');
    var canvas = new Canvas();
    var chatbox = new Chatbox($('#chat-container'), socket, userId);

    socket.on('connect', function() {
        sessionId = this.socket.sessionid;

        socket.emit('joinBoard', boardId, userId);

        socket.on('startPath', function(data, sessionId) {
            canvas.startPath(data, sessionId);
        });
        socket.on('continuePath', function(data, sessionId) {
            canvas.continuePath(data, sessionId);
        });
        socket.on('clearCanvas', function() {
            canvas.clear();
        });

        socket.on('insertText', function(data, sessionID) {
            canvas.insertText(data, sessionId);
            view.draw();
        });

        socket.on('updateChatbox', function(userId, message) {
            chatbox.postMessage(userId, message);
        });
    });

    $('#pencil').click(function() {
        tool1.activate();
        $('.selected').removeClass('selected');
        $('#colorPicker').spectrum('enable');
        $('#pencil').addClass('selected');
    });


    $('#text').click(function() {
        tool2.activate();
        $('.selected').removeClass('selected');
        $('#text').addClass('selected');
    });

    $('#clear').click(function() {
        canvas.clear();
        $('#pencil').removeClass('selected');
        socket.emit('clearCanvas');
    });

    $('#save').click(function() {
        $('canvas#draw')[0].toBlob(function(blob) {
            saveAs(blob, 'test.png');
        });
    });

    function onMouseDown(event) {
        var color = $('#colorPicker').spectrum('get').toString();
        var data = {
            point: {
                x: event.point.x,
                y: event.point.y
            },
            color: color
        };
        canvas.startPath(data, sessionId);
        socket.emit('startPath', data, sessionId);
    }

    //pencil
    tool1 = new Tool();
    tool1.onMouseDown = onMouseDown;

    tool1.onMouseDrag = function(event) {
        var data = {
            point: {
                x: event.point.x,
                y: event.point.y
            },
            tool: 'tool1'
        };
        canvas.continuePath(data, sessionId);
        socket.emit('continuePath', data, sessionId);
    };

    tool2 = new Tool();

    tool2.onMouseDown = function(event) {
        var data = {
            point: {
                x: event.point.x,
                y: event.point.y
            },
            tool: 'tool2'
        };

        canvas.insertText(data, sessionId);
    }

    $('#current-message').keypress(function(e) {
        // Enter key:
        if (e.which == 13) {
            chatbox.sendCurrentMessage();
        }
    });

    $('#send-message').click(chatbox.sendCurrentMessage);
});
