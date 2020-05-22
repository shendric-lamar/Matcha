const express = require('express');
const router = express.Router();
const { ensureCompleted, ensureAuthenticated, forwardAuthenticated } = require('../config/auth');


// Load User model
const User = require('../models/User');

router.get('/chat', ensureAuthenticated, ensureCompleted, (req, res) => {
    if (req.query.me != req.user.username) {
        req.flash(
            'error_msg',
            "You don't have acces to that page!"
        );
        res.redirect('/dashboard');
    } else {
        User.findOne({ username: req.query.user }).then(user => {
            res.render('chat', {
                user: req.user,
                recip: user
            });
        }).catch(err => console.log(err)); 
    }
});

router.get('/', ensureAuthenticated, ensureCompleted, (req, res) => {
    User.find({ username: { $in: req.user.matches }}).then(profiles => {
        res.render('matches', {
            user: req.user,
            profiles: profiles
        }); 
    }).catch(err => console.log(err)); 
})

module.exports = router;