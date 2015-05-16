$(document).ready(function() {
    var validShortcodeLength = 4;

    // Close modal when clicked outside of:
    $('.modal').click(function() {
        window.location.assign('#');
    });
    // Prevent click events from .dialog child from bubbling up:
    $('.modal .dialog').click(function(e) {
        return false;
    });

    $('.shortcode').on('keyup change', function() {
        if ($(this).val().length === validShortcodeLength) {
            // TODO: validate on backend if it is legitimate.
            $('.submit').removeClass('invalid');
        }
    });

    $('.submit').click(function() {
        if (!$(this).hasClass('invalid')) {
            window.location.assign('/boards/' + $('#boardid').val() + '?' + $('#userid').val());
        }
    });
});
