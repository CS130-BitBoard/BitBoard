exports.get = function(req, res) {
    res.render('board', {
        title: 'BitBoard',
        boardId: req.params.boardId
    });
};
