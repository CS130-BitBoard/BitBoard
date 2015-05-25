$(document).ready(function() {
    var socket = io.connect('/');
    socket.on('connect', function() {
        socket.on('updatechatbox', function(userId, data) {
            if (userId === '') {
                $('#chat').append(data + '<br>');
            } else {
                if (data !== '') {
                    $('#chat').append('<b>' + userId + ' :</b> ' + data + '<br>');
                }
            }
        });
    });

    function sendMessage() {
        var message = $('#data').val();
        $('#data').val('');
        socket.emit('sendchatmessage', message);
    }

    $('#data').keypress(function(e) {
        // Enter key:
        if (e.which == 13) {
            sendMessage();
        }
    });
    $('#send').click(sendMessage);
});
