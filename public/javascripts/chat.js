$(document).ready(function() {
    var socket = io.connect('/');
    socket.on('connect', function() {
        $('#data').show().focus();
        $('#send').show();
    });

    socket.on('updatechatbox', function(userid, data) {
        if (userid === '') {
            $('#chat').append(data + '<br>');
        } else {
            if (data !== '') {
                $('#chat').append('<b>' + userid + ' :</b> ' + data + '<br>');
            }
        }
    });

    $(function() {
        $('#send').click(function() {
            var message = $('#data').val();
            $('#data').val('');
            socket.emit('sendchatmessage', message);
        });

        $('#data').keypress(function(e) {
            if (e.which == 13) {
                $(this).blur();
                $('#send').click();
                $('#data').focus();
            }
        });
    });
});
