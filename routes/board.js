module.exports.get = function(req, res) {
    res.render('board', {
        title: 'BitBoard',
        boardId: req.params.boardId,
        userId: req.query.userid
    });
};

// TODO: consult current boards so as not to conflict
function createBoardId() {
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789',
        boardIdLength = 4,
        id = '',
        i;

    for (i = 0; i < boardIdLength; ++i) {
        id += possibleCharacters[Math.floor(Math.random() * possibleCharacters.length)];
    }

    return id;
}

module.exports.create = function(req, res) {
    // TODO: apply password to board somehow

    var userId = req.body.userid;
    var password = req.body.password;
    var boardId = createBoardId();

    res.redirect('/boards/' + boardId + '?userid=' + userId);
};
