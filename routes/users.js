const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const nodemailer = require('nodemailer');
const uniqid = require('uniqid');

function sendEmail(username, key, email) {
    var text = '<h1>Welcome to Matcha!</h1>' + '<p>Please click the following link to activate your account: </p>' + '<a href="http://localhost:5000/users/activate?username=' + username + '&key=' + key + '">ACTIVATE</a>';
    var flag = 1;

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'camagrusocial@gmail.com',
            pass: '!Camagru1793'
        }
    });
    mailOptions = {
        from: '"Matcha" <infosmatcha@gmail.com>',
        to: email,
        subject: 'Activate your Matcha account!',
        text: text,
        html: '<p>' + text + '</p>'
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            flag = 0;
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });
    return flag;
}

// Load User model
const User = require('../models/User');
const { forwardAuthenticated } = require('../config/auth');

// Login Page
router.get('/login', (req, res) => {
    res.render('login')
});

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

// Register
router.post('/register', (req, res) => {
    const { fname, lname, username, email, password, password2 } = req.body;
    let errors = [];

    if (!fname || !lname || !username || !email || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password != password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            fname,
            lname,
            username,
            email,
            password,
            password2
        });
   
    } else {
        User.findOne({ username: username }).then(user => {
            if (user) {
                errors.push({ msg: 'That username is already in use!' });
                res.render('register', {
                    errors,
                    fname,
                    lname,
                    username,
                    email,
                    password,
                    password2
                }); 
            }
        })
        .catch(err => console.log(err));

        User.findOne({ email: email }).then(user => {
            if (user) {
                errors.push({ msg: 'Email address is already in use!' });
                res.render('register', {
                    errors,
                    fname,
                    lname,
                    username,
                    email,
                    password,
                    password2
                });
            } else {
                const key = uniqid();
                const newUser = new User({
                    fname,
                    lname,
                    username,
                    email,
                    password,
                    key
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        flag = sendEmail(username, key, email)
                        if (flag == 1) {
                            newUser
                                .save()
                                .then(user => {
                                    req.flash(
                                        'success_msg',
                                        'You are now registered! Please click the link in the email we sent you to activate your account!'
                                    );
                                    res.redirect('/users/login');
                                })
                                .catch(err => console.log(err));
                        } else {
                            errors.push({ msg: 'Something went wrong, please try again later...' });
                            res.render('register', {
                                errors,
                                fname,
                                lname,
                                username,
                                email,
                                password,
                                password2
                            });
                        }
                    });
                });
            }
        })
        .catch(err => console.log(err));
    }
});

// Check where to send user after loggin in:
// 1) back to login page (not activated via email)
// 2) to profile completion page (activated but profile incomplete)
// 3) to photos page (activated, completed info but need to upload pictures)
// 4) to dashboard (activated and completed info and photos)
router.get('/check', (req, res) => {
    const user = req.user.username;
    User.find({ username: user }).then(user => {
        if (user[0]) {
            if (user[0].activated == 0) {
                req.flash(
                    'error_msg',
                    'Please activate your account before logging in!'
                );
                res.redirect('/users/login');
            }
            else if (user[0].activated == 1 && user[0].completedInfo == 0) {
                res.redirect('/complete_profile?user=' + user[0].username);
            }
            else if (user[0].activated == 1 && user[0].completedInfo == 1 && user[0].completedPics == 0) {
                res.redirect('../photos/upload_photos?user=' + user[0].username);
            }
            else {
                res.redirect('/dashboard');
            }
        }
    })
    .catch(err => console.log(err));
});

// Login
router.post('/login', passport.authenticate('local', { failureRedirect: '/users/login' , failureFlash: true }), (req, res, next) => {
    res.redirect('/users/check?user=' + req.user.username);
});

// Logout
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are now logged out!');
    res.redirect('/users/login');
});


// Email activation
router.get('/activate', (req, res) => {
    const key = req.query.key;
    const usernameLink = req.query.username;
    User.find({ username: usernameLink }).then(user => {
        if(user[0]) { 
            if (user[0].activated == 1) {
                req.flash(
                    'error_msg',
                    'Your account has already been activated! Please log in'
                );
                res.redirect('/users/login');
            }
            else if (user[0].key == key) {
                User.updateOne({ username: usernameLink }, { $set: { activated: 1 }}).then(() => {
                    req.flash(
                        'success_msg',
                        'Your account has been activated! Please log in'
                    );
                    res.redirect('/users/login');
                })
                .catch(err => console.log(err));    
            } else {
                req.flash(
                    'error_msg',
                    'Something went wrong... Please click the link you received by email!'
                );
                res.redirect('/users/login');
            } 
        } else {
            req.flash(
                'error_msg',
                'No user found with that username...'
            );
            res.redirect('/users/login');
        }
    })
    .catch(err => console.log(err));
})

module.exports = router;