const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const app = express();
var http = require('http').createServer(app);
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

io.sockets.on('connection', function (socket) {
    const users = [];

    socket.on('login', function(data){
        users[socket.id] = data.userId;
        console.log(users);
    });

    socket.on('recipient', function (recipient) {
        socket.recipient = recipient;
    });
    
    socket.on('username', function (username) {
        socket.username = username;
        io.emit('is_online', '🔵 <i>' + socket.username + ' has joined the chat..</i>');
    });

    socket.on('disconnect', function (username) {
        io.emit('is_online', '🔴 <i>' + socket.username + ' has left the chat..</i>');
    })

    socket.on('chat_message', function (message, username, recipient) {
        io.emit('chat_message', '<strong>' + socket.username + '</strong>: ' + message, socket.username, socket.recipient);
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