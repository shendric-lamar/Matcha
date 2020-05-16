const express = require('express');
const router = express.Router();
const { ensureCompleted, ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Load User model
const User = require('../models/User');

// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('welcome'));

// Dashboard
router.get('/dashboard', ensureAuthenticated, ensureCompleted, (req, res) => {
        res.render('dashboard', {
            user: req.user
        });
});

// Profile Completion Page
router.get('/complete_profile', ensureAuthenticated, (req, res) => {
    if (req.user.completedInfo == true) {
        res.redirect('/photos/upload_photos?user=' + req.user.username);
    } else {
        res.render('complete_profile', {
            user: req.user
        });
    }
});

router.post('/complete_profile', (req, res) => {
    const { gender, orientation, tags, bio } = req.body;
    let errors = [];
    const usernameLink = req.user.username;

    if (!gender || !orientation || !bio || !tags) {
        errors.push({ msg: "Please fill in all fields!"});
    }

    var tagsArray = tags.split(" ");

    if (errors.length > 0) {
        res.render('complete_profile', {
            errors,
            gender,
            orientation,
            tags,
            bio
        });
    }    

    User.updateOne({ username: usernameLink }, { $set: { gender: gender, orientation: orientation, tags: tagsArray, bio: bio.trim()}}).then(() => {
        User.updateOne({ username: usernameLink }, { $set: { completedInfo: 1 } }).then(() => {
            res.redirect('/photos/upload_photos?user=' + req.user.username);
        });
    })
    .catch(err => console.log(err));   
});

module.exports = router;