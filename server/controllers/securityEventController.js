const SecurityEvent = require('../models/SecurityEvent');
const Link = require('../models/Link');

// Get all security events for a specific link
exports.getLinkSecurityEvents = async (req, res) => {
  try {
    const { linkId } = req.params;
    
    // Verify link exists and user has permission (omitted for brevity)
    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found.' });
    }

    const events = await SecurityEvent.find({ linkId })
                                      .sort({ timestamp: -1 })
                                      .populate('invitationId', 'recipientEmail recipientName status');

    res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({ message: 'Failed to retrieve security events.' });
  }
};
