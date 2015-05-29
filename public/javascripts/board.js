/*
 * This function is responsible for managing the state of the canvas.
 * Functions for drawing and adding text live here.
 */
function Canvas() {
    //The set of paths currently being drawn. Key'd by client id.
    var paths = {};
    //This group contains each item currently on the cavas, so they can be manipulated as one
    var items = new Group();
    //The x,y of the last point drawn on the canvas for a given line.
    var last_points = {};

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
        items = new Group();
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
        items.addChild(path);
        last_points[sessionId] = data.point;
        paths[sessionId] = path;
        view.draw();
    };

    /*
     * Adds new points to a line (dragging the mouse).
     * This function grows the canvas as the user tries to draw off the edge
     * Params:
     *    data: Information describing the line (tool used, click location, etc)
     *    sessionId: The id of the client that drew the line
     */
    this.continuePath = function(data, sessionId) {
        var path = paths[sessionId];
        if (data.tool === 'pencilTool' || data.tool === 'eraserTool') {
            path.add(new Point(data.point.x, data.point.y));
        }

        this.resizeView(data.point, sessionId);
        last_points[sessionId] = data.point;

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

    /*
     * Virtually "grows" the canvas.
     * This function compares the point that is being drawn to the edges of the canvas.
     * If the point gets close enough, we downscale every item on the canvas to move the point we
     * are about to draw back into the "safe" zone. The scaling parameter is given a floor to prevent
     * the canvas elements from shrinking too quickly.
     * Params:
     *    point: The x,y coordinate of the point being are drawing
     *    sessionId: The id of the client that generated this point
     */
    this.resizeView = function(point, sessionId) {
        var center = project.view.center;
        var view_size = project.view.size;

        //The percent of each edge of the screen that triggers resizes
        var buffer_ratio = .075;

        //The amount of distance we need to move towards the edge of the screen to trigger a resize
        //This is to stabilize leaving the boudary (say the user moves their mouse parallel to the edge or wavers)
        var scale_thresh = .7;
        var last_point = last_points[sessionId];

        //The resize zone size in project coordinates
        var x_buffer = view_size.width * buffer_ratio;
        var y_buffer = view_size.height * buffer_ratio;

        //Set to an impossibly high default, we never scale by this amount.
        var scale_factor = 2;


        //For each side, check that we are in the buffer zone, and that we have moved enough to trigger
        //a resize.
        //The resize amount is determined by how far we are into the buffer zone, as we scale the new point to be just outside
        //The buffer.
        if (point.x < x_buffer && (last_point.x -  point.x) >= scale_thresh) {
            scale_factor = (center.x - x_buffer) / (center.x - point.x);
        } else if (point.x > (view_size.width - x_buffer) && (point.x - last_point.x) >= scale_thresh) {
            scale_factor = (view_size.width - x_buffer) / point.x;
        }

        //Do the same as above, but in this case we pick the smallest scale factor, in case the user is in a corner and
        //both x and y resizes get triggered.
        if (point.y < y_buffer && (last_point.y - point.y) >= scale_thresh ) {
            scale_factor = Math.min(scale_factor, (center.y - y_buffer) / (center.y - point.y));
        } else if (point.y > (view_size.height - y_buffer) && (point.y - last_point.y) >= scale_thresh) {
            scale_factor = Math.min(scale_factor, (view_size.height - y_buffer) / point.y);
        }

        //Rescale all the elements
        if (scale_factor < 1) {
            scale_factor = Math.max(scale_factor, 0.99); //Set a floor at .99 of the original size
            //Make sure to scale around the center of the canvas
            items.scale(scale_factor, center);
        }

    }

    this.clientDisplays = {};
    this.updateClientDisplay = function(userId, x, y, width, height) {
        $display = this.clientDisplays[userId];
        $display.css('left', x + 'px')
                .css('top', y + 'px')
                .width(width)
                .height(height);
    }

    this.addClientDisplay = function(userId) {
        if (!this.clientDisplays[userId]) {
            $('.canvas-wrapper').append(
                '<div class="client-display" data-userid="' + userId + '">' + userId + '</div>');
        }
        this.clientDisplays[userId] = $('.client-display[data-userid="' + userId + '"]');
    };

    this.removeClientDisplay = function(userId) {
        if (this.clientDisplays[userId]) {
            this.clientDisplays[userId].remove();
            delete this.clientDisplays[userId];
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

        if ($('.wrapper').data('mobile') === false) {
            socket.on('updateClientDimensions', function(userId, x, y, width, height) {
                if (!canvas.clientDisplays[userId]) {
                    canvas.addClientDisplay(userId);
                }
                canvas.updateClientDisplay(userId, x, y, width, height);
            });

            socket.on('userDisconnected', function(userId) {
                canvas.removeClientDisplay(userId);
            });
        }
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

    if ($('.wrapper').data('mobile') === true) {
        $('#board').scroll(function() {
            var x = $(this).scrollLeft();
            var y = $(this).scrollTop();
            socket.emit('updateClientDimensions', userId, x, y, $(window).width(), $(window).height());
        });
    }

    // Enables the pencil tool
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
