module.exports = function(boards) {
    this.get = function(req, res) {
        var boardId = req.params.boardId;
        var userId = req.session.userId;

        // If board already has this user, allow him/her in:
        if (userId && boards[boardId].users.indexOf(userId) !== -1) {
            res.render('board', {
                title: 'BitBoard',
                boardId: boardId,
                userId: userId,
                mobile: !!req.query.mobile ? 'true' : 'false'
            });
            return;
        }

        res.send(401, 'You are not a member of this board.');
    };

    // KLUDGE: Insecure method.
    this.get_Mobile = function(req, res) {
        var boardId = req.params.boardId;
        var userId = req.query.userid;
        var password = req.query.password;

        if (!boards[boardId] || boards[boardId].password !== password) {
            res.send(401, 'Password incorrect.');
            return;
        }

        if (boards[boardId].users.indexOf(userId) === -1) {
            boards[boardId].users.push(userId);
        }
        req.session.userId = userId;

        res.render('board', {
            title: 'BitBoard',
            boardId: boardId,
            userId: userId,
            mobile: 'true'
        });
    };

    this.join = function(req, res) {
        var boardId = req.body.boardid;
        var userId = req.body.userid;
        var password = req.body.password;

        if (boards[boardId].password !== password) {
            res.send(401, 'Password incorrect.');
            return;
        }

        if (boards[boardId].users.indexOf(userId) === -1) {
            boards[boardId].users.push(userId);
        }
        req.session.userId = userId;

        res.redirect('/boards/' + boardId);
    };

    this.create = function(req, res) {
        var userId = req.body.userid;
        var password = req.body.password;
        var boardId = createBoardId();

        boards[boardId] = new Board(password);

        boards[boardId].users.push(userId);
        req.session.userId = userId;

        res.redirect('/boards/' + boardId);
    };

    return this;
};

function Board(password) {
    this.password = password || '';
    this.users = []; // list of userIds (Strings)
    this.stateMessages = []; // list of StateMessages
}

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
