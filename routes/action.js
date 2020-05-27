const express = require('express');
const router = express.Router();
const { ensureCompleted, ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

const User = require('../models/User');

router.get('/dislike', ensureAuthenticated, ensureCompleted, (req, res) => {
    if (!req.user.likes.includes(req.query.user) && !req.user.dislikes.includes(req.query.user)) {
        User.updateOne({ username: req.user.username }, { $push: { dislikes: req.query.user } }).then(() => {
            res.redirect('/dashboard');
        }).catch(err => console.log(err));
    } else {
        res.redirect('/dashboard');
    }
})

router.get('/like', ensureAuthenticated, ensureCompleted, (req, res) => {
    if (!req.user.likes.includes(req.query.user) && !req.user.dislikes.includes(req.query.user)) {
        User.updateOne({ username: req.query.user }, { $inc: { rating: 1 }}).then(() => {
            User.updateOne({ username: req.user.username }, { $push: { likes: req.query.user }}).then(user => {
                User.findOne({ username: req.query.user }).then(profile => {
                    if (profile) {
                        if(profile.likes.length > 0 && profile.likes.includes(req.user.username)) {
                            User.updateOne({ username: req.user.username }, { $push: { matches: req.query.user}}).then(() => {
                                User.updateOne({ username: req.query.user }, { $push: { matches: req.user.username } }).then(() => {
                                    req.flash(
                                        'match',
                                        "Yay! It's a match!"
                                    );
                                    res.redirect('/dashboard');
                                }).catch(err => console.log(err));
                            }).catch(err => console.log(err));
                        } else {
                        res.redirect('/dashboard');
                        }
                    } else {
                        res.redirect('/dashboard');
                    }
                }).catch(err => console.log(err));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    } else {
        res.redirect('/dashboard');
    }
});

module.exports = router;