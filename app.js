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

io.sockets.on('connection', function (socket) {

    socket.on('login', function(username) {
        User.updateOne({ username: username }, { $set: { socket: socket.id } }).catch(err => console.log(error));
    });

    socket.on('recipient', function (recipient) {
        socket.recipient = recipient;
    });
    
    socket.on('join', function (user1, user2) {
        Room.findOne({ $and: [{ $or: [{ user1: user1 }, { user2: user1 }] }, { $or: [{ user1: user2 }, { user2: user2 }] }] }).then((room) => {
            if(room) {
                socket.join(room.id);
                Msg.find({ $and: [{ $or: [{ from: user1 }, { to: user1 }] }, { $or: [{ from: user2 }, { to: user2 }] }] })
                .sort({ date: 1})
                .then((msgs) => {
                    msgs.forEach(msg => {
                        if (user1 == msg.from) {
                            io.to(socket.id).emit('chat_message', msg.content, user1, user2);
                        } else {
                            io.to(socket.id).emit('chat_message', msg.content, user2, user1);
                        }
                    });
                    io.to(socket.id).emit('focus');
                }).catch(err => console.log(err));
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

    socket.on('disconnect', function (username) {
        io.emit('is_online', '🔴 <i>' + socket.username + ' has left the chat..</i>');
    })

    socket.on('chat_message', function (message, user1, user2) {
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

});


// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/photos', require('./routes/photos'));
app.use('/profile', require('./routes/profile'));
app.use('/action', require('./routes/action'));
app.use('/matches', require('./routes/matches'));

const PORT = process.env.PORT || 5000

http.listen(PORT, console.log(`Server started on ${PORT}`));