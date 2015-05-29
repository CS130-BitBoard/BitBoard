function Canvas() {
    var paths = {};
    var items = new Group();
    var last_point;
    this.clear = function() {
        project.activeLayer.removeChildren();
        // var rect = new Rectangle();
        // rect.left = 0;
        // rect.right = 0;
        // rect.top = 0;
        // rect.bottom = 0;
        // rect.fillColor = 'white';
        items = new Group();
        view.draw();
    };

    this.startPath = function(data, sessionId) {
        var path = new Path();
        path.strokeColor = data.color;
        path.strokeWidth = data.width;
        path.strokeCap = 'round';
        path.strokeJoin = 'round';

        path.add(new Point(data.point.x, data.point.y));
        items.addChild(path);
        last_point = data.point;
        paths[sessionId] = path;
        view.draw();
    };

    this.continuePath = function(data, sessionId) {
        var path = paths[sessionId];
        if (data.tool === 'pencilTool' || data.tool === 'eraserTool') {
            path.add(new Point(data.point.x, data.point.y));
        }

        this.resize_view(data.point);
        last_point = data.point;

        view.draw();
    };

    this.insertText = function(data, sessionId) {
        var text = new PointText(new Point(data.point.x, data.point.y));
        text.justification = 'left';
        text.fillColor = data.color;
        text.fontSize = 20;
        text.content = window.prompt('Please enter some text:');
    }

    this.setEnabled = function(enable) {
        var $canvas = $('#draw');
        if (enable) {
            $canvas.removeClass('disabled');
        } else {
            $canvas.addClass('disabled');
        }
    };

    this.resize_view = function(point) {
        var center = project.view.center;
        var view_size = project.view.size;
        var buffer_ratio = .025;
        var scale_thresh = .7;
        var x_buffer = view_size.width * buffer_ratio;
        var y_buffer = view_size.height * buffer_ratio;

        var scale_factor = 2;

        if (point.x < x_buffer && (last_point.x -  point.x) >= scale_thresh) {
            scale_factor = (center.x - x_buffer) / (center.x - point.x);
        } else if (point.x > (view_size.width - x_buffer) && (point.x - last_point.x) >= scale_thresh) {
            scale_factor = (view_size.width - x_buffer) / point.x;
        } 

        if (point.y < y_buffer && (last_point.y - point.y) >= scale_thresh ) {
            scale_factor = Math.min(scale_factor, (center.y - y_buffer) / (center.y - point.y));
        } else if (point.y > (view_size.height - y_buffer) && (point.y - last_point.y) >= scale_thresh) {
            scale_factor = Math.min(scale_factor, (view_size.height - y_buffer) / point.y);
        }

        //We need to scale down
        if (scale_factor < 1) {
            scale_factor = Math.max(scale_factor, 0.99);
            items.scale(scale_factor, center);
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
    $('#colorPicker').spectrum({
        color: '#000',
        showPalette: true,
        hideAfterPaletteSelect: true,
        showButtons: false,
        preferredFormat: 'rgb'
    });

    var sessionId;
    var boardId = $('#board-id').data('value');
    var userId = $('#user-id').data('value');

    var socket = io.connect('http://localhost:3000/'); // This is stupid but is required to fix weird issues.
    var canvas = new Canvas();
    var chatbox = new Chatbox($('#chat-container'), socket, userId);

    socket.on('connect', function() {
        sessionId = socket.io.engine.id;

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

        socket.on('insertText', function(data, sessionId) {
            canvas.insertText(data, sessionId);
            view.draw();
        });

        socket.on('updateChatbox', function(userId, message) {
            chatbox.postMessage(userId, message);
        });
    });

    Tool.prototype.createDataFromPoint = function(point) {
        return {
            point: {
                x: point.x,
                y: point.y
            },
            color: this.color || $('#colorPicker').spectrum('get').toString(),
            tool: this.toolName || 'pencilTool',
            width: this.width || 5
        };
    };
    Tool.prototype.onMouseDown = function(event) {
        var data = this.createDataFromPoint(event.point);
        this.mouseDownEvent(data);
    };
    Tool.prototype.onMouseDrag = function(event) {
        var data = this.createDataFromPoint(event.point);
        this.mouseDragEvent(data);
    };

    //Generic tool for drawing on the canvas
    function DrawTool(options) {
        Tool.call(this);
        this.toolName = options.toolName || 'pencilTool';
        this.color = options.color;
        this.width = options.width;
    }
    DrawTool.prototype = Object.create(Tool.prototype);
    DrawTool.prototype.constructor = DrawTool;

    DrawTool.prototype.mouseDownEvent = function(data) {
        canvas.startPath(data, sessionId);
        socket.emit('startPath', data, sessionId);
    }
    DrawTool.prototype.mouseDragEvent = function(data) {
        canvas.continuePath(data, sessionId);
        socket.emit('continuePath', data, sessionId);
    };

    //Tool for adding text to the canvas
    function TextTool() {
        Tool.call(this);
    }
    TextTool.prototype = Object.create(Tool.prototype);
    TextTool.prototype.constructor = TextTool;

    TextTool.prototype.mouseDownEvent = function(data) {
        canvas.insertText(data, sessionId);
        socket.emit('insertText', data, sessionId);
        return;
    }
    TextTool.prototype.mouseDragEvent = function(data) {
        //No-op function
    };

    var pencilTool = new DrawTool({ toolName: 'pencilTool' });
    var eraserTool = new DrawTool({ toolName: 'eraserTool', color: 'white', width: 20 });
    var textTool = new TextTool();

    $('#pan').click(function() {
        canvas.setEnabled(false);
        $('.selected').removeClass('selected');
        $('#pan').addClass('selected');
    });

    $('#pencil').click(function() {
        pencilTool.activate();
        canvas.setEnabled(true);
        $('.selected').removeClass('selected');
        $('#colorPicker').spectrum('enable');
        $('#pencil').addClass('selected');
    });

    $('#text').click(function() {
        textTool.activate();
        canvas.setEnabled(true);
        $('.selected').removeClass('selected');
        $('#text').addClass('selected');
    });

    $('#eraser').click(function() {
        eraserTool.activate();
        canvas.setEnabled(true);
        $('.selected').removeClass('selected');
        $('#eraser').addClass('selected');
    });

    $('#clear').click(function() {
        canvas.clear();
        $('#pencil').removeClass('selected');
        socket.emit('clearCanvas');
    });

    $('#save').click(function() {
        var filename = window.prompt('Please name the image:', 'bitboard-' + boardId + '.png');
        $('canvas#draw')[0].toBlob(function(blob) {
            saveAs(blob, filename);
        });
    });

    $('#toggle-chat').click(function() {
        chatbox.toggle();
    });

    $('#current-message').keypress(function(e) {
        // Enter key:
        if (e.which == 13) {
            chatbox.sendCurrentMessage();
        }
    });

    $('#send-message').click(chatbox.sendCurrentMessage);

    $('#pencil').click();
});
