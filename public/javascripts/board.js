/*
 * This function is responsible for managing the state of the canvas.
 * Functions for drawing and adding text live here.
 */
function Canvas() {
    var paths = {};

    /*
     * Removes every element from the canvas, leaving it blank
     */
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

    /*
     *
     * Begins drawing a new line. Called when a user clicks
     * Params:
     *    data: Information describing the line (tool used, click location, etc)
     *    sessionId: The id of the client that drew the line
     */
    this.startPath = function(data, sessionId) {
        var path = new Path();
        path.strokeColor = data.color;
        path.strokeWidth = data.width;
        path.strokeCap = 'round';
        path.strokeJoin = 'round';

        path.add(new Point(data.point.x, data.point.y));
        paths[sessionId] = path;

        view.draw();
    };

    /*
     * Adds new points to a line (dragging the mouse)
     * Params:
     *    data: Information describing the line (tool used, click location, etc)
     *    sessionId: The id of the client that drew the line
     */
    this.continuePath = function(data, sessionId) {
        var path = paths[sessionId];
        if (data.tool === 'pencilTool' || data.tool === 'eraserTool') {
            path.add(new Point(data.point.x, data.point.y));
        }
        view.draw();
    };

    /*
     * Gets a string from the user and inserts it into the canvas at the specified point
     * Params:
     *    data: Information describing the click event (click location, color).
     *    sessionId: The id of the client that drew the line
     */
    this.insertText = function(data, sessionId) {
        var text = new PointText(new Point(data.point.x, data.point.y));
        text.justification = 'left';
        text.fillColor = data.color;
        text.fontSize = 20;
        text.content = data.text;
    }

    /*
     * Toggles whether editing the canvas is allowed
     * Params:
     *    enable: If true, allow the canvas to be edited. If false, prevents edits.
     */
    this.setEnabled = function(enable) {
        var $canvas = $('#draw');
        if (enable) {
            $canvas.removeClass('disabled');
        } else {
            $canvas.addClass('disabled');
        }
    };
}

//This function controls the chat window.
function Chatbox($chatContainer, socket, userId) {

    /*
     * Puts a status message in the chat box (e.g. a user joining)
     * Params:
     *    message: The message to be posted
     */
    var postStatusMessage = function(message) {
        $chatContainer.find('.chat').append('<span class="status-message">' + message + '</span><br>');
    };

    /*
     * Puts a message sent by a client in the chat box
     * Params:
     *    userId: The id of the client who sent the message
     *    message: The message to be posted
     */
    var postUserMessage = function(userId, message) {
        $chatContainer.find('.chat').append('<b>' + userId + ' :</b> ' + message + '<br>');
    };

    /*
     * Delegates posting a message to the correct handler function
     * Params:
     *    userId: The id of client. Will be falsy if the message wasn't sent by a user
     *    message: The message to be posted
     */
    this.postMessage = function(userId, message) {
        if (!userId) {
            postStatusMessage(message);
        } else {
            postUserMessage(userId, message);
        }
    };

    /* 
     * Posts a chat message to the server
     */
    this.sendCurrentMessage = function() {
        var message = $chatContainer.find('#current-message').val();
        $chatContainer.find('#current-message').val('');
        postUserMessage(userId, message);
        socket.emit('sendChatMessage', message);
    };

    /* 
     * Toggles the state of the chat box between open and closed.
     */
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

//Sets up the client side of BitBoard
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

    /* 
     * Invokes behavior based on messages from the server
     */
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

    //The following section deals with user input tools.
    //We do so by extending the Too, prototype provided by Paper.js

    /* 
     * Gathers data when a user clicks or drags the mouse
     * Params:
     *    point: The x and y coordinates(in the Paper.js coordinate space) of the mouse click
     *
     * Returns:
     *    An object holding the point, the tool used, and the selected color and width of the line
     */
    Tool.prototype.createDataFromPoint = function(point) {
        return {
            point: {
                x: point.x,
                y: point.y
            },
            color: this.color || $('#colorPicker').spectrum('get').toString(),
            tool: this.toolName || 'pencilTool',  //If no tool is selected, default to pencil
            width: this.width || 5
        };
    };

    /* 
     * Triggers when the user clicks the mouse. Dispatches behavior to the current tool. (Strategy Pattern)
     * Params:
     *    event: Data about the mouse click
     */
    Tool.prototype.onMouseDown = function(event) {
        var data = this.createDataFromPoint(event.point);
        this.mouseDownEvent(data);
    };

    /* 
     * Triggers when the user drags the mouse. Dispatches behavior to the current tool. (Strategy Pattern)
     * Params:
     *    event: Data about the mouse position and movement
     */
    Tool.prototype.onMouseDrag = function(event) {
        var data = this.createDataFromPoint(event.point);
        this.mouseDragEvent(data);
    };

    /*
    * Generic tool for drawing on the canvas
    * Params:
    *    options: Optional info about the tool, such as line color and thinkness
    *             Any options not provided will use defaults instead.
    */
    function DrawTool(options) {
        Tool.call(this);
        this.toolName = options.toolName || 'pencilTool';
        this.color = options.color;
        this.width = options.width;
    }
    DrawTool.prototype = Object.create(Tool.prototype);
    DrawTool.prototype.constructor = DrawTool;

    /* 
     * Tells the canvas to start drawing a line, and notifies the server we started to draw
     * Params:
     *    data: The position and color if the line start
     */
    DrawTool.prototype.mouseDownEvent = function(data) {
        canvas.startPath(data, sessionId);
        socket.emit('startPath', data, sessionId);
    }

    /* 
     * Tells the canvas to continue drawing a line, and notifies the server we continue to draw
     * Params:
     *    data: The position and color if the line segment
     */
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

    /* 
     * Prompts the user for text and inserts in into the canvas, notifying the server of the contents and position
     * Params:
     *    data: The position of the click
     */
    TextTool.prototype.mouseDownEvent = function(data) {
        data.text = window.prompt('Please enter some text:');
        canvas.insertText(data, sessionId);
        socket.emit('insertText', data, sessionId);
        return;
    }

    /* 
     * This function does nothing
     */
    TextTool.prototype.mouseDragEvent = function() {};

    //Instantiate the tools
    var pencilTool = new DrawTool({ toolName: 'pencilTool' });
    var eraserTool = new DrawTool({ toolName: 'eraserTool', color: 'white', width: 20 });
    var textTool = new TextTool();

    //Enables the panning tool
    $('#pan').click(function() {
        canvas.setEnabled(false);
        $('.selected').removeClass('selected');
        $('#pan').addClass('selected');
    });

    //Enables the pencil tool
    $('#pencil').click(function() {
        pencilTool.activate();
        canvas.setEnabled(true);
        $('.selected').removeClass('selected');
        $('#colorPicker').spectrum('enable');
        $('#pencil').addClass('selected');
    });

    //Enables the text insertion tool
    $('#text').click(function() {
        textTool.activate();
        canvas.setEnabled(true);
        $('.selected').removeClass('selected');
        $('#text').addClass('selected');
    });

    //Enables the eraser tool
    $('#eraser').click(function() {
        eraserTool.activate();
        canvas.setEnabled(true);
        $('.selected').removeClass('selected');
        $('#eraser').addClass('selected');
    });

    //Clears all data from the screen, and sends a clear message to the server
    $('#clear').click(function() {
        canvas.clear();
        $('#pencil').removeClass('selected');
        socket.emit('clearCanvas');
    });

    //Converts the current canvas to a PNG image and downloads it.
    //The user is prompted to enter a name, thougn a default is provided.
    $('#save').click(function() {
        var filename = window.prompt('Please name the image:', 'bitboard-' + boardId + '.png');
        $('canvas#draw')[0].toBlob(function(blob) {
            saveAs(blob, filename);
        });
    });

    //Opens/closes the chat box
    $('#toggle-chat').click(function() {
        chatbox.toggle();
    });

    //Sends a message when the user presses enter
    $('#current-message').keypress(function(e) {
        // Enter key:
        if (e.which == 13) {
            chatbox.sendCurrentMessage();
        }
    });

    $('#send-message').click(chatbox.sendCurrentMessage);

    $('#pencil').click();
});
