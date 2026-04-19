const invitationService = require('../services/invitation.service');

async function listMyNotifications(req, res, next) {
  try {
    const result = await invitationService.listMyNotifications(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function acceptInvitation(req, res, next) {
  try {
    const { invitationId } = req.params;
    const result = await invitationService.acceptInvitation(invitationId, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function declineInvitation(req, res, next) {
  try {
    const { invitationId } = req.params;
    const result = await invitationService.declineInvitation(invitationId, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function listOrganizationInvites(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    const invites = await invitationService.listPendingForOrganization(organizationId, req.user.id);
    return res.status(200).json({ invites });
  } catch (err) {
    return next(err);
  }
}

async function cancelOrganizationInvite(req, res, next) {
  try {
    const { id: organizationId, invitationId } = req.params;
    const result = await invitationService.cancelInvitation(organizationId, invitationId, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMyNotifications,
  acceptInvitation,
  declineInvitation,
  listOrganizationInvites,
  cancelOrganizationInvite,
};
