var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");
var Book = require("../models/book");

router.post('/signup', function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({success: false, msg: 'Please pass username and password.'});
  } else {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

router.post('/signin', function(req, res) {
  console.log("signin");
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) throw err;

    if (!user) {
      res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});


/*THÊM 1 QUYỂN SÁCH*/
router.post('/book', passport.authenticate('jwt', { session: false}), function(req, res) {
 
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);
    var newBook = new Book({
      isbn: req.body.isbn,
      title: req.body.title,
      author: req.body.author,
      publisher: req.body.publisher,
      photo: req.body.photo,
    });

    newBook.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Save book failed.'});
      }
      res.json({success: true, msg: 'Successful created new book.'});
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

/*LẤY 1 QUYỂN SÁCH*/ 
router.get('/book', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Book.find(function (err, books) {
      if (err) return next(err);
      res.json(books);
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

/*XÓA 1 QUYỂN SÁCH*/
router.delete('/book/:bookId', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Book.findByIdAndRemove(req.params.bookId).then(book => {
      if(!book) {
          return res.status(404).send({
              message: "book not found with id " + req.params.bookId
          });
      }
      res.send({message: "book deleted successfully!"});
    }).catch(err => {
        if(err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "book not found with id " + req.params.bookId
            });                
        }
        return res.status(500).send({
            message: "Could not delete book with id " + req.params.bookId
        });
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

/*CẬP NHẬT MỘT QUYỂN SÁCH*/
router.put('/book/:bookId', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {  
    // Find book and update it with the request body
    Book.findByIdAndUpdate(req.params.bookId, {
      isbn: req.body.isbn|| "Untitled isbn",
      title: req.body.title|| "Untitled title",
      author: req.body.author|| "Untitled author",
      publisher: req.body.publisher|| "Untitled publisher",
      photo: req.body.photo|| "https://via.placeholder.com/150X150",
    }, {new: true})
    .then(book => {
        if(!book) {
            return res.status(404).send({
                message: "book not found with id " + req.params.bookId
            });
        }
        res.send(book);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "book not found with id " + req.params.bookId
            });                
        }
        return res.status(500).send({
            message: "Error updating book with id " + req.params.bookId
        });
    });
   
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }

});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;
