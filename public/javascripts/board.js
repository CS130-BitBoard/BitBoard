function Canvas() {
    var paths = {};

    this.clear = function() {
        project.activeLayer.removeChildren();
        // var rect = new Rectangle();
        // rect.left = 0;
        // rect.right = 0;
        // rect.top = 0;
        // rect.bottom = 0;
        // rect.fillColor = 'white';
        view.draw();
    };

    this.startPath = function(data, sessionId) {
        var path = new Path();
        path.strokeColor = data.color;
        path.strokeWidth = 5;
        path.strokeCap = 'round';
        path.strokeJoin = 'round';

        if (data.tool === 'tool3') {
            path.strokeColor = 'white';
            path.strokeWidth = 50;
        }

        path.add(new Point(data.point.x, data.point.y));
        paths[sessionId] = path;

        view.draw();
    };

    this.continuePath = function(data, sessionId) {
        var path = paths[sessionId];
        if (data.tool === 'tool1' || data.tool === 'tool3') {
            path.add(new Point(data.point.x, data.point.y));
        }
        view.draw();
    };

    this.insertText = function(data, sessionId) {
        if (data.tool === 'tool2') {
            var text = new PointText(new Point(data.point.x, data.point.y));
            text.justification = 'left';
            text.fillColor = data.color;
            text.fontSize = 20;
            text.content = window.prompt("Please enter some text:");
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

    this.toggle = function() {
        if ($chatContainer.hasClass('closed')) {
            $chatContainer.removeClass('closed');
            $('#draw').addClass('left');
        } else {
            $chatContainer.addClass('closed');
            $('#draw').removeClass('left');
        }
    };
}

$(document).ready(function() {
    $("#colorPicker").spectrum({
        color: "#000",
        showPalette: true,
        hideAfterPaletteSelect: true,
        showButtons: false,
        preferredFormat: "rgb"
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

    $('#eraser').click(function() {
        tool3.activate();
        $('.selected').removeClass('selected');
        $('#eraser').addClass('selected');
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

    $('#toggle-chat').click(function() {
        chatbox.toggle();
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
            tool: 'tool2',
            color: $('#colorPicker').spectrum('get').toString()
        };

        canvas.insertText(data, sessionId);
    }

    tool3 = new Tool();
    tool3.onMouseDown = function(event) {
        var data = {
            point: {
                x: event.point.x,
                y: event.point.y
            },
            tool: 'tool3'
        };
        canvas.startPath(data, sessionId);
        socket.emit('startPath', data, sessionId);
    };

    tool3.onMouseDrag = function(event) {
        var data = {
            point: {
                x: event.point.x,
                y: event.point.y
            },
            tool: 'tool3'
        };
        canvas.continuePath(data, sessionId);
        socket.emit('continuePath', data, sessionId);
    };

    $('#current-message').keypress(function(e) {
        // Enter key:
        if (e.which == 13) {
            chatbox.sendCurrentMessage();
        }
    });

    $('#send-message').click(chatbox.sendCurrentMessage);

    $('#pencil').click();
});
