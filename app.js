const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const app = express();
const uniqid = require('uniqid');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const faker = require('faker');
const fakerModel = require('./models/seederSchema');
// const faker = require('faker');

// Set static folder
app.use(express.static("public"));

// Passport config
require('./config/passport')(passport);

// DB Config
const db = require('./config/keys').MongoURI;

// Connect to Mongo
mongoose.connect(db, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true })
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Bodyparser
app.use(express.urlencoded({ extended: false }));

// Express Session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global vars
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.match = req.flash('match');
    next();
});

const User = require('./models/User');
const Msg = require('./models/Msg');
const Room = require('./models/Room');

io.sockets.on('connection', (socket) => {

    socket.on('login', (username) => {
        User.updateOne({ username: username }, { $set: { socket: socket.id, online: true } }).catch(err => console.log(error));
        Room.find({ $or: [{ user1: username }, { user2: username }] }).then(rooms => {
            rooms.forEach(room => {
                io.to(room.id).emit('online', username);
            });
            socket.broadcast.emit('online', username);
        }).catch(err => console.log(error));
    });

    socket.on('username', (username) => {
        socket.username = username;
    })

    socket.on('recipient', (recipient) => {
        socket.recipient = recipient;
    });

    socket.on('join', (user1, user2) => {
        socket.username = user1;
        Room.findOne({ $and: [{ $or: [{ user1: user1 }, { user2: user1 }] }, { $or: [{ user1: user2 }, { user2: user2 }] }] }).then((room) => {
            if (room) {
                socket.join(room.id);
            } else {
                let id = uniqid();
                const newRoom = new Room({
                    id,
                    user1,
                    user2
                });
                newRoom
                    .save()
                    .catch(err => console.log(err));
                socket.join(id);
            }
        }).catch(err => console.log(err));
    });

    socket.on('chat_message', (message, sender_name, recip_name) => {
        Room.findOne({ $and: [{ $or: [{ user1: sender_name }, { user2: sender_name }] }, { $or: [{ user1: recip_name }, { user2: recip_name }] }] }).then((room) => {
            const newMsg = new Msg({
                roomId: room.id,
                content: message,
                from: sender_name,
                to: recip_name,
                date: Date.now()
            });
            newMsg
                .save()
                .then(() => {
                    io.to(room.id).emit('chat_message', message, sender_name, recip_name);
                })
                .catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('notif', (sender_name, recip_name) => {
        User.findOne({ username: recip_name }).then(recip => {
            User.findOne({ username: sender_name }).then(sender => {
                io.to(recip.socket).emit('notif', sender.fname + ' has sent you a message!', sender.username, recip.username);
                User.updateOne({ username: recip_name }, { $push: { notif: sender.fname + ' has sent you a message!' } })
                    .catch(err => console.log(err));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('viewed', (viewer_name, profile_name) => {
        if (viewer_name != profile_name) {
            User.findOne({ username: profile_name }).then(profile => {
                User.findOne({ username: viewer_name }).then(viewer => {
                    io.to(profile.socket).emit('notif', viewer.fname + ' visited your profile!', viewer.username, profile.username);
                    User.updateOne({ username: profile_name }, { $push: { notif: viewer.fname + ' visited your profile!' } })
                        .catch(err => console.log(error));
                }).catch(err => console.log(err));
            }).catch(err => console.log(err));
        }
    });

    socket.on('markRead', (user) => {
        User.updateOne({ username: user }, { $pull: { notif: { $exists: true } } })
            .catch(err => console.log(err));
    });

    socket.on('like', (user_name, liked_name) => {
        User.findOne({ username: liked_name }).then(liked => {
            User.findOne({ username: user_name }).then(user => {
                io.to(liked.socket).emit('notif', user.fname + ' has liked your profile!', user.username, liked.username);
                User.updateOne({ username: liked_name }, { $push: { notif: user.fname + ' has liked your profile!' } })
                    .catch(err => console.log(error));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('match', (user_name, match_name) => {
        User.findOne({ username: user_name }).then(user => {
            User.findOne({ username: match_name }).then(match => {
                io.to(match.socket).emit('notif', 'You have a new match with ' + user.fname + '!', user.username, match.username);
                User.updateOne({ username: match_name }, { $push: { notif: 'You have a new match with ' + user.fname + '!' } })
                    .catch(err => console.log(err));
                io.to(user.socket).emit('notif', 'You have a new match with ' + user.fname + '!', user.username, match.username);
                User.updateOne({ username: user_name }, { $push: { notif: 'You have a new match with ' + match.fname + '!' } })
                    .catch(err => console.log(err));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('unmatch', (user_name, unliked_name) => {
        User.findOne({ username: unliked_name }).then(unliked => {
            User.findOne({ username: user_name }).then(user => {
                io.to(unliked.socket).emit('notif', user.fname + ' has unmatched you...', user.username, unliked.username);
                User.updateOne({ username: unliked_name }, { $push: { notif: user.fname + ' has unmatched you...' } })
                    .catch(err => console.log(err));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('disconnect', () => {
        User.findOne({ socket: socket.id }).then(user => {
            if (user) {
                User.updateOne({ username: user.username }, { $set: { online: false } }).then(() => {
                    Room.find({ $or: [{ user1: user.username }, { user2: user.username }] }).then(rooms => {
                        rooms.forEach(room => {
                            io.to(room.id).emit('offline');
                        });
                        socket.broadcast.emit('offline');
                    }).catch(err => console.log(err));
                }).catch(err => console.log(err));
            }
        }).catch(err => console.log(err));
    });
});


//seeders

app.get('/seeders', (req, res) => {
    fakerModel.find((err, data) => {
        if (err) {
            console.log(err)
        }
        else if (data) {
            res.render('seeder', { data: data });
        }
        else {
            res.render('seeder', { data: {} });
        }
    })
})
app.post('/seeders', (req, res) => {
    let errors = [];
    const { amount, minlat, maxlat, minlong, maxlong } = req.body;
    if (minlat > maxlat || minlong > maxlong) {
        errors.push({ msg: 'Maximum latitude/longitude should be larger than minimum latitude/longitude!' });
        res.render('seeders', errors);
    }
    for (i = 0; i < amount; i++) {
        var gender = ["Male", "Female"];
        var genderRandom = gender[Math.floor(Math.random() * gender.length)];
        var orientation = ["Heterosexual", "Bisexual", "Homosexual"];
        var orientationRandom = orientation[Math.floor(Math.random() * orientation.length)];
        var coordinates = [];
        coordinates[0] = Math.random() * (maxlong * 1 - minlong * 1 + 1) + minlong * 1;
        coordinates[1] = Math.random() * (maxlat * 1 - minlat * 1 + 1) + minlat * 1;
        var tags = [];
        for (j = 0; j < 5; j++) {
            tags[j] = faker.random.word();
        }
        var date = new Date(Date.now());
        var dateMiny = date.getFullYear() - 18;
        var dateMaxy = date.getFullYear() - 65;
        var dateMin = dateMiny + '-01-01';
        var dateMax = dateMaxy + '-01-01';
        var fakee = new User({
            fname: faker.name.firstName(),
            lname: faker.name.lastName(),
            username: faker.internet.userName(),
            email: faker.internet.email(),
            amount: 2,
            p1: faker.image.avatar(),
            p2: faker.image.avatar(),
            password: faker.internet.password(),
            activated: true,
            completedInfo: true,
            completedPics: true,
            dob: faker.date.between(dateMax, dateMin),
            orientation: orientationRandom,
            gender: genderRandom,
            bio: faker.lorem.sentence(),
            tags: tags,
            location: { coordinates: coordinates },
            bot: true
        });
        fakee.save((err, data) => {
            if (err) {
                console.log(err)
            }
        });
    }
    res.redirect('/');
})

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/photos', require('./routes/photos'));
app.use('/profile', require('./routes/profile'));
app.use('/action', require('./routes/action'));
app.use('/matches', require('./routes/matches'));
app.use('/notif', require('./routes/notif'));

const PORT = process.env.PORT || 5000

http.listen(PORT, console.log(`Server started on ${PORT}`));
