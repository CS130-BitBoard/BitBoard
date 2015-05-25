$(document).ready(function() {
    var validShortcodeLength = 4;

    // Close modal when clicked outside of:
    $('.modal').click(function(e) {
        if ($(e.target).hasClass('modal')) {
            window.location.assign('#');
        }
    });

    $('.shortcode').on('keyup', function() {
        if ($(this).val().length === validShortcodeLength) {
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
