$(document).ready(function() {
    var validShortcodeLength = 4;
    var validUsernameLength = 2;

    // Close modal when clicked outside of:
    $('.modal').click(function(e) {
        if ($(e.target).hasClass('modal')) {
            window.location.assign('#');
        }
    });

    //Checks that the board code is the right length
    function shortcodeValid() {
        return $('.shortcode').val().length === validShortcodeLength;
    }

    //Checks that the username is long enough
    function useridValid() {
        return $('.userid').val().length >= validUsernameLength;
    }

    //Enables the join button when both the user id and the room code are valud
    $('.shortcode, .userid').on('keyup', function() {
        if (shortcodeValid() && useridValid()) {
            // TODO: validate on backend if it is legitimate.
            $('.submit').removeClass('invalid');
        } else {
            $('.submit').addClass('invalid');
        }
    });

    $('.submit.join').click(function() {
        if (!$(this).hasClass('invalid')) {
            var $dialog = $(this).parent();
            var boardId = $dialog.find('.shortcode').val();
            var userId = $dialog.find('.userid').val();
            window.location.assign('/boards/' + boardId + '?userid=' + userId);
        }
    });
});
