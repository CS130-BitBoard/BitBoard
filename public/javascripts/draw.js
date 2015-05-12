var paths = {};
var sessionId;

var socket = io.connect('/');
socket.on('connect', function() {
    sessionid = this.socket.sessionid;

    socket.on('startPath', function(data, sessionId) {
        if (data.point){
            data.point = new Point(data.point[1], data.point[2]);
        }
        startPath(data, sessionId);
    });

    socket.on('continuePath', function(data, sessionId) {
        if (data.point){
            data.point = new Point(data.point[1], data.point[2]);
        }
       continuePath(data, sessionId);
        view.draw();
    });

    socket.on('clearCanvas', function() {
        clearCanvas();
        view.draw();
    });
});

$("#pencil").click(function() {
    tool1.activate();
    $("#colorPicker").spectrum("enable");
    $("#pencil").addClass('selected');
});

$("#clear").click(function() {
    clearCanvas();
    view.draw();
    $("#pencil").removeClass('selected');
    socket.emit('clearCanvas');
});

function clearCanvas() {
    project.activeLayer.removeChildren();
}

var path;
var color;

function onMouseDown(event) {
    color = $("#colorPicker").spectrum("get").toString();
    var point = event.point;
    var data = {
        point: point,
        color: color
    }
    startPath(data, sessionId);
    socket.emit("startPath", data, sessionId);
}

//pencil
tool1 = new Tool();
tool1.onMouseDown = onMouseDown;

tool1.onMouseDrag = function(event) {
    var point = event.point;
    var data = {
        point: point,
        tool: "tool1"
    };
    continuePath(data, sessionId);
    socket.emit("continuePath",data, sessionId);
}

function startPath(data, sessionId) {
    paths[sessionId] = new Path();
    paths[sessionId].strokeColor = data.color;
    paths[sessionId].add(data.point);
}

function continuePath(data, sessionId) {
    var path = paths[sessionId];
    if (data.tool === "tool1"){
        path.add(data.point);
    }
}
