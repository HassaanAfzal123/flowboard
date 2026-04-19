const memberService = require('../services/member.service');

async function listMembers(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    const members = await memberService.listMembers(organizationId, req.user.id);
    return res.status(200).json({ members });
  } catch (err) {
    return next(err);
  }
}

async function inviteMember(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const invitation = await memberService.inviteMember(organizationId, req.user.id, email, role);
    return res.status(201).json({ invitation });
  } catch (err) {
    return next(err);
  }
}

async function updateMemberRole(req, res, next) {
  try {
    const { id: organizationId, userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const updated = await memberService.updateMemberRole(organizationId, req.user.id, userId, role);
    return res.status(200).json({ member: updated });
  } catch (err) {
    return next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const { id: organizationId, userId } = req.params;

    await memberService.removeMember(organizationId, req.user.id, userId);

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function transferOwnership(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    const { userId: newOwnerUserId } = req.body;

    if (!newOwnerUserId) {
      return res.status(400).json({ message: 'userId (new owner) is required' });
    }

    const result = await memberService.transferOwnership(
      organizationId,
      req.user.id,
      newOwnerUserId
    );

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function leaveOrganization(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    await memberService.leaveOrganization(organizationId, req.user.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMembers,
  inviteMember,
  updateMemberRole,
  transferOwnership,
  removeMember,
  leaveOrganization,
};

