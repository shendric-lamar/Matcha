const mongoose = require('mongoose');

const MsgSchema = new mongoose.Schema({

});

const Msg = mongoose.model('Msg', MsgSchema);

module.exports = Msg;