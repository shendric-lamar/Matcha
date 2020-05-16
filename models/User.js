const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: true
    },
    lname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    key: {
        type: String
    },
    activated: {
        type: Boolean,
        default: 0
    },
    completedInfo: {
        type: Boolean,
        default: 0
    },
    completedPics: {
        type: Boolean,
        default: 0
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        default: "male"
    },
    orientation: {
        type: String,
        enum: ["heterosexual", "bisexual", "homosexual"],
        default: "bisexual"
    },
    bio: {
        type: String,
        default: ""
    },
    tags: {
        type: Array,
        default: []
    },
    amount: {
        type: Number,
        default: 0
    },
    p1: {
        type: String,
        default: ''
    },
    p2: {
        type: String,
        default: ''
    },
    p3: {
        type: String,
        default: ''
    },
    p4: {
        type: String,
        default: ''
    },
    p5: {
        type: String,
        default: ''
    },
    long: {
        type: String,
        default: ''
    }

});

const User = mongoose.model('User', UserSchema);

module.exports = User;
