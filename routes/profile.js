const express = require('express');
const router = express.Router();
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const { ensureCompleted, ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const User = require('../models/User');

router.get('/', ensureAuthenticated, ensureCompleted, (req, res) => {
    if (req.query.page > req.user.amount) {
        res.render('profile', {
            user: req.user,
            page: 1
        });
    } else {
        res.render('profile', {
            user: req.user,
            page: req.query.page
        });
    }
});

router.get('/edit', ensureAuthenticated, ensureCompleted, (req, res) => {
    res.render('edit', {
        user: req.user
    });
});

router.post('/edit', (req, res) => {
    const { fname, lname, username, gender, orientation, tags, bio } = req.body;
    let errors = [];

    if (!fname || !lname || !username || !gender || !orientation || !bio || !tags) {
        errors.push({ msg: "Please fill in all fields!" });
    } 

    var tagsArray = tags.split(" ");

    if (username != req.user.username) {
        unameL = req.user.username.length;
        let photos = [];
        glob(req.user.username + "*", { matchBase: true, nodir: true }, (er, files) => {
            files.forEach(item => {
                let file = item.slice(15);
                fs.rename(path.join(__dirname, '../public/uploads/' + file), path.join(__dirname, '../public/uploads/' + username + file.slice(unameL)), function (err) {
                    if (err) console.log('ERROR: ' + err);
                });
                photos.push(username + file.slice(unameL));
            });
            let j = photos.length;
            for (i = j; i < 5; i++) {
                photos.push('');
            }
            console.log(photos);
            console.log(req.user.email);
            User.updateOne({ email: req.user.email },
                { $set: { p1: photos[0], p2: photos[1], p3: photos[2], p4: photos[3], p5: photos[4] } }).then(() => {
                    console.log("data updated");
                })
                .catch(err => console.log(err));
        });
    }

    User.find({ username: username }).then(user => {
        if (typeof user[0] != 'undefined' && username != req.user.username) {
            errors.push({ msg: "Username is already in use..." });
            res.render('edit', { user: req.user, errors });
        } else {
            if (errors.length > 0) {
                console.log("test");
                res.render('edit', {
                    user: req.user,
                    errors
                });
            }
            User.updateOne({ username: req.user.username }, { $set: { fname: fname, lname: lname, username: username, gender: gender, orientation: orientation, tags: tagsArray, bio: bio.trim() } }).then(() => {
                req.flash(
                    'success_msg',
                    'Your profile has been updated!'
                );
                res.redirect('/dashboard');
            })
            .catch(err => console.log(err));
        }
    })
    .catch(err => console.log(err));
});

module.exports = router;