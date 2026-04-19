const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const organizationController = require('../controllers/organization.controller');
const memberController = require('../controllers/member.controller');
const invitationController = require('../controllers/invitation.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/', organizationController.listMyOrganizations);
router.post('/', organizationController.createOrganization);
router.get('/:id', organizationController.getOrganization);
router.patch('/:id', organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);

// Members within an organization
router.get('/:id/members', memberController.listMembers);
router.post('/:id/members', memberController.inviteMember);
router.get('/:id/invitations', invitationController.listOrganizationInvites);
router.post('/:id/invitations/:invitationId/cancel', invitationController.cancelOrganizationInvite);
router.post('/:id/transfer-ownership', memberController.transferOwnership);
router.post('/:id/leave', memberController.leaveOrganization);
router.patch('/:id/members/:userId', memberController.updateMemberRole);
router.delete('/:id/members/:userId', memberController.removeMember);

module.exports = router;

