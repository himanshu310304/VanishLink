const express = require('express');
const router = express.Router({ mergeParams: true }); // to access linkId from parent
const invitationController = require('../controllers/invitationController');
const securityEventController = require('../controllers/securityEventController');

// Expects /api/links/:linkId/invitations
router.post('/', invitationController.createInvitations);
router.get('/', invitationController.getInvitations);

// Update status
router.patch('/:id/status', invitationController.updateStatus);

// Get security events for the link
router.get('/security-events', securityEventController.getLinkSecurityEvents);

module.exports = router;
