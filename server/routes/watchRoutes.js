// server/routes/watchRoutes.js
const express = require('express');
const router = express.Router();
const WatchRoom = require('../models/WatchRoom');

// helper to generate short room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/watch/create - create a new watch room
router.post('/create', async (req, res) => {
  try {
    const { title, videoUrl, hostName, hostId } = req.body || {};

    if (!videoUrl) {
      return res.status(400).json({ message: 'videoUrl is required' });
    }

    const finalTitle = title || 'Untitled Watch Party';

    let roomCode = generateRoomCode();
    let existing = await WatchRoom.findOne({ roomCode });
    while (existing) {
      roomCode = generateRoomCode();
      existing = await WatchRoom.findOne({ roomCode });
    }

    const room = await WatchRoom.create({
      roomCode,
      title: finalTitle,
      videoUrl,
      hostName: hostName || 'Host',
      hostId: hostId || null,
    });

    return res.status(201).json({
      roomCode: room.roomCode,
      title: room.title,
      videoUrl: room.videoUrl,
      hostName: room.hostName,
    });
  } catch (err) {
    console.error('Error creating watch room:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/watch/:roomCode - fetch room info
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await WatchRoom.findOne({ roomCode });

    if (!room || !room.isLive) {
      return res.status(404).json({ message: 'Watch room not found' });
    }

    res.json({
      roomCode: room.roomCode,
      title: room.title,
      videoUrl: room.videoUrl,
      hostName: room.hostName,
    });
  } catch (err) {
    console.error('Error fetching watch room:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
