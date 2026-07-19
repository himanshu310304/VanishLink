// server/models/WatchRoom.js
const mongoose = require('mongoose');

const watchRoomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },

    hostId: { type: String }, // you can later plug in your user._id
    hostName: { type: String },

    isLive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WatchRoom', watchRoomSchema);
