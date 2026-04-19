const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const invitationController = require('../controllers/invitation.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/notifications', invitationController.listMyNotifications);
router.post('/invitations/:invitationId/accept', invitationController.acceptInvitation);
router.post('/invitations/:invitationId/decline', invitationController.declineInvitation);

module.exports = router;
