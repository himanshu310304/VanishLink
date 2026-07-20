const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const Link = require('../models/Link');

// Create new invitations for a link
exports.createInvitations = async (req, res) => {
  try {
    const { linkId } = req.params;
    const { recipients } = req.body; // Array of { email, name }

    const link = await Link.findById(linkId);
    if (!link) return res.status(404).json({ message: 'Link not found' });
    
    // Check if the user is the owner/admin
    // (Assuming req.user is populated by some auth middleware)

    if (!link.isRecipientBound) {
      return res.status(400).json({ message: 'This link is not configured for recipient-bound sharing.' });
    }

    const invitations = [];
    for (const recipient of recipients) {
      const token = crypto.randomBytes(32).toString('hex');
      const invitation = new Invitation({
        linkId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        token
      });
      await invitation.save();
      invitations.push(invitation);
    }

    // In a real system, we would trigger an email to each recipient here containing the token/link.

    res.status(201).json({ message: 'Invitations created successfully', invitations });
  } catch (error) {
    console.error('Create Invitations Error:', error);
    res.status(500).json({ message: 'Error creating invitations' });
  }
};

// Get all invitations for a link
exports.getInvitations = async (req, res) => {
  try {
    const { linkId } = req.params;
    const invitations = await Invitation.find({ linkId }); // Return tokens so Creator can copy them in the demo
    res.status(200).json({ invitations });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invitations' });
  }
};

// Update status (e.g. freeze or revoke)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'frozen', 'revoked', 'pending'

    const invitation = await Invitation.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );

    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
    res.status(200).json({ message: 'Status updated', invitation });
  } catch (error) {
    res.status(500).json({ message: 'Error updating invitation' });
  }
};
