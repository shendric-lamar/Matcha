const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const app = express();
const uniqid = require('uniqid');
const http = require('http').createServer(app);
const io = require('socket.io')(http)

// Set static folder
app.use(express.static("public"));

// Passport config
require('./config/passport')(passport);

// DB Config
const db = require('./config/keys').MongoURI;

// Connect to Mongo
mongoose.connect(db, { useUnifiedTopology: true, useNewUrlParser: true })
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
        console.log("connected");
        User.updateOne({ username: username }, { $set: { socket: socket.id, online: true } }).catch(err => console.log(error));
        Room.find({ $or: [{ user1: username }, { user2: username }] }).then(rooms => {
            rooms.forEach(room => {
                io.to(room.id).emit('online', username);
            });
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
            if(room) {
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

    socket.on('chat_message', (message, user1, user2) => {
        Room.findOne({ $and: [{ $or: [{ user1: user1 }, { user2: user1 }] }, { $or: [{ user1: user2 }, { user2: user2 }] }] }).then((room) => {
            const newMsg = new Msg({
                roomId: room.id,
                content: message,
                from: user1,
                to: user2,
                date: Date.now()
            });
            newMsg
                .save()
                .then(() => {
                    io.to(room.id).emit('chat_message', message, user1, user2);
                })
                .catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    // socket.on('offline', (username) => {
    //     Room.find({ $or: [{ user1: username}, { user2: username }]}).then(rooms => {
    //         rooms.forEach(room => {
    //             io.to(room.id).emit('offline', username);
    //         })
    //     }).catch(err => console.log(err));
    // });

    socket.on('notif', (user1, user2) => {
        User.findOne({ username: user2 }).then(user => {
            User.findOne({ username: user1 }).then(sender => {
                io.to(user.socket).emit('notif', sender.fname + ' has sent you a message!', user.fname, user2);
                User.updateOne({ username: user2 }, { $push: { notif: sender.fname + ' has sent you a message!'}})
                .catch(err => console.log(error));
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('viewed', (user, liked) => {
        User.findOne({ username: liked }).then(liked => {
            User.findOne({ username: user }).then(user => {
                io.to(liked.socket).emit('notif', user.fname + ' visited your profile!', user.username, liked.username)
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('markRead', (user) => {
        console.log("check");
        User.updateOne({ username: user }, { $pull: { notif: { $exists: true } }})
        .catch(err => console.log(err));
    });

    socket.on('like', (user, liked) => {
        User.findOne({ username: liked }).then(liked => {
            User.findOne({ username: user }).then(user => {
                io.to(liked.socket).emit('notif', user.fname + ' has liked your profile!', user.username, liked.username)
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    });

    socket.on('disconnect', () => {
        console.log("disconnected", socket.id);
        User.findOne({ socket: socket.id }).then(user => {
            if (user) {
                User.updateOne({ username: user.username }, { $set: { online: false }}).then(() => {
                    Room.find({ $or: [ { user1: user.username }, {user2: user.username }]}).then(rooms => {
                        rooms.forEach(room => {
                            io.to(room.id).emit('offline');
                        });
                    }).catch(err => console.log(err));
                }).catch(err => console.log(err));
            }
        }).catch(err => console.log(err));
    });
});


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