$(document).ready(function() {
    $("#colorPicker").spectrum({
      color: "#000",
      showAlpha: true,
      showPalette: true
    });

    var paths = {};
    var sessionId;
    var boardId = $('#board-id').data('value');
    var userId = $('#user-id').data('value');

    var socket = io.connect('/');
    socket.on('connect', function() {
        sessionId = this.socket.sessionid;

        socket.emit('joinBoard', boardId, userId);

        socket.on('startPath', function(data, sessionId) {
            startPath(data, sessionId);
        });
        socket.on('continuePath', function(data, sessionId) {
            continuePath(data, sessionId);
            view.draw();
        });
        socket.on('clearCanvas', function() {
            clearCanvas();
            view.draw();
        });

        socket.on('updateChatbox', function(userId, message) {
            // KLUDGE: this branch seems redundant
            if (userId === '') {
                $('#chat').append(message + '<br>');
            } else {
                if (message !== '') {
                    $('#chat').append('<b>' + userId + ' :</b> ' + message + '<br>');
                }
            }
        });
    });

    $('#pencil').click(function() {
        tool1.activate();
        $('#colorPicker').spectrum('enable');
        $('#pencil').addClass('selected');
    });

    $('#clear').click(function() {
        clearCanvas();
        view.draw();
        $('#pencil').removeClass('selected');
        socket.emit('clearCanvas');
    });

    $('#save').click(function() {
        $('canvas#draw')[0].toBlob(function(blob) {
            saveAs(blob, 'test.png');
        });
    });

    function clearCanvas() {
        project.activeLayer.removeChildren();
    }

    var path;
    var color;

    function onMouseDown(event) {
        color = $('#colorPicker').spectrum('get').toString();
        var data = {
            point: {
                x: event.point.x,
                y: event.point.y
            },
            color: color
        };
        startPath(data, sessionId);
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
        continuePath(data, sessionId);
        socket.emit('continuePath', data, sessionId);
    }

    function startPath(data, sessionId) {
        paths[sessionId] = new Path();
        paths[sessionId].strokeColor = data.color;
        paths[sessionId].add(new Point(data.point.x, data.point.y));
    }

    function continuePath(data, sessionId) {
        var path = paths[sessionId];
        if (data.tool === 'tool1') {
            path.add(new Point(data.point.x, data.point.y));
        }
    }

    // Chat:
    function sendMessage() {
        var message = $('#current-message').val();
        $('#current-message').val('');
        socket.emit('sendChatMessage', message);
    }
    $('#current-message').keypress(function(e) {
        // Enter key:
        if (e.which == 13) {
            sendMessage();
        }
    });
    $('#send-message').click(sendMessage);
});
