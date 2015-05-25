$(document).ready(function() {
    var socket = io.connect('/');
    socket.on('connect', function() {
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
