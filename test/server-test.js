var assert = require('assert');
var status = require('http-status');
var superagent = require('superagent');
var app = require('../app');
var url = require('url');


describe('/boards', function() {
  var server;
 
 //We set up a fresh server each time to prevent session conflicts
  beforeEach(function() {
    server = app();

  });
 
  afterEach(function() {
    server.close();
  });

  it('Client can create and join boards', function(done) {
    superagent.post('http://localhost:3000/boards')
           .send({ userid: 'creator' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert.ifError(err);
		    	assert.equal(res.status, status.OK);
		    	var board_path  = url.parse(res.req.path).pathname
			    superagent.get('http://localhost:3000'+board_path)
			    		.send({userid: 'joiner'})
			    		.end(function(err, res) {
			    			assert.ifError(err);
			    			assert.equal(res.status, status.OK);
			    			done();
			    		});
			});
  });

  it('Client cannot join non-existant boards', function(done) {
    superagent.get('http://localhost:3000/boards/test')
           .send({ userid: 'tester' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert(err, 'No error on joining an invalid board');
		    	done();
		    });
  });


  it('Rejects long board names', function(done) {
    superagent.get('http://localhost:3000/boards/toolong')
           .send({ userid: 'tester' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert(err, 'Server accepted a long board name');
		    	done();
		    });
  });

  it('Rejects short board names', function(done) {
    superagent.get('http://localhost:3000/boards/foo')
           .send({ userid: 'tester' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert(err, 'Server accepted a short board name');
		    	done();
		    });
  });

  it('rejects duplicate usernames', function(done) {
    superagent.post('http://localhost:3000/boards')
           .send({ userid: 'user' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert.ifError(err);
		    	assert.equal(res.status, status.OK);
			    superagent.get('http://localhost:3000'+res.req.path)
			    		.end(function(err, res) {
			    			assert(err, "Server accepted a duplicate username");
			    			done();
			    		});
			});
  });

  it('rejects empty usernames', function(done) {
    superagent.post('http://localhost:3000/boards')
           .send({ userid: 'user' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert.ifError(err);
		    	assert.equal(res.status, status.OK);
		    	var board_path  = url.parse(res.req.path).pathname;
				superagent.get('http://localhost:3000'+board_path)
			    		.end(function(err, res) {
			    			assert(err);
			    			done();
			    		});
			});
  });

  it('rejects empty usernames', function(done) {
    superagent.post('http://localhost:3000/boards')
           .send({ userid: 'user' })
           .send({ password: '' })
    	   .end(function(err, res) {
		    	assert.ifError(err);
		    	assert.equal(res.status, status.OK);
		    	var board_path  = url.parse(res.req.path).pathname;
				superagent.get('http://localhost:3000'+board_path)
						.send('userid', '')
			    		.end(function(err, res) {
			    			assert(err);
			    			done();
			    		});
			});
  });

  it('Can join boards with a valid password', function(done) {
    superagent.post('http://localhost:3000/boards')
           .send({ userid: 'Troy' })
           .send({ password: 'swordfish' })
    	   .end(function(err, res) {
		    	assert.ifError(err);
		    	assert.equal(res.status, status.OK);
		    	var board_path  = url.parse(res.req.path).pathname;
				superagent.get('http://localhost:3000'+board_path)
						.send({ userid: 'Abed' })
           				.send({ password: 'swordfish' })
			    		.end(function(err, res) {
			    			assert.ifError(err);
			    			assert.equal(res.status, status.OK);
			    			done();
			    		});
			});
  });

  it('Cannot join boards with an invalid password', function(done) {
    superagent.post('http://localhost:3000/boards')
           .send({ userid: 'Jon' })
           .send({ password: 'Snow' })
    	   .end(function(err, res) {
		    	assert.ifError(err);
		    	assert.equal(res.status, status.OK);
		    	var board_path  = url.parse(res.req.path).pathname;
				superagent.get('http://localhost:3000'+board_path)
						.send({ userid: 'Joffrey' })
           				.send({ password: 'Lannister' })
			    		.end(function(err, res) {
			    			assert(err);
			    			done();
			    		});
			});
  });

});