const mongoose = require('mongoose');

// var gender = ["male", "female"];
// var genderRandom = gender[Math.floor(Math.random() * gender.length)]
// var orientation = ["heterosexual", "bisexual", "homosexual"];
// var genderRandom = orientation[Math.floor(Math.random() * orientation.length)]
const fakerUser = new mongoose.Schema({
    fname: String,
    lname: String,
    username: String,
    email: String,
    password: String,
    activated: Boolean,
    completedInfo: Boolean,
    completedPics: Boolean,
    dob: Date,
    // orientation: orientation[genderRandom],
    // gender: gender[genderRandom],
    bio: String,
    tags: String,
    amount: Number,
    rating: Number,
})

module.exports = mongoose.model('fakerCollection', fakerUser);
