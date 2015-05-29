$(document).ready(function() {
    var validShortcodeLength = 4;
    var validUsernameLength = 2;

    // Close modal when clicked outside of:
    $('.modal').click(function(e) {
        if ($(e.target).hasClass('modal')) {
            window.location.assign('#');
        }
    });

    function shortcodeValid() {
        return $('.shortcode').val().length === validShortcodeLength;
    }

    function useridValid() {
        return $('.userid').val().length >= validUsernameLength;
    }

    // $('.shortcode, .userid').on('keyup', function() {
    //     if (shortcodeValid() && useridValid()) {
    //         // TODO: validate on backend if it is legitimate.
    //         $('.submit').removeClass('invalid');
    //     } else {
    //         $('.submit').addClass('invalid');
    //     }
    // });

    // $('.submit.join').click(function() {
    //     if (!$(this).hasClass('invalid')) {
    //         var $dialog = $(this).parent();
    //         var boardId = $dialog.find('.shortcode').val();
    //         var userId = $dialog.find('.userid').val();
    //         window.location.assign('/boards/' + boardId + '?userid=' + userId);
    //     }
    // });
});
