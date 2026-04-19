const mongoose = require('mongoose');
const Invitation = require('../models/invitation.model');
const Member = require('../models/member.model');
const User = require('../models/user.model');
const organizationService = require('./organization.service');

const INVITE_EXPIRY_DAYS = 7;

function toObjectId(value, label = 'id') {
  if (value == null || value === '') {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
}

function expiryDateFromNow() {
  const now = Date.now();
  return new Date(now + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function mapInvite(invite) {
  const org = invite.organizationId;
  const invitedBy = invite.invitedByUserId;
  return {
    id: invite._id,
    organization: org
      ? {
          id: org._id,
          name: org.name,
        }
      : null,
    invitedBy: invitedBy
      ? {
          id: invitedBy._id,
          name: invitedBy.name,
          email: invitedBy.email,
        }
      : null,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

async function createInvitation(organizationId, actingUserId, email, role = 'member') {
  await organizationService.requireRole(organizationId, actingUserId, ['owner', 'admin']);

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    const err = new Error('Email is required');
    err.statusCode = 400;
    throw err;
  }

  if (!['member', 'admin'].includes(role)) {
    const err = new Error('Invalid invite role');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error('User with this email does not exist');
    err.statusCode = 404;
    throw err;
  }

  const orgOid = toObjectId(organizationId, 'organizationId');
  const userOid = toObjectId(user._id, 'userId');

  const membership = await Member.findOne({ organizationId: orgOid, userId: userOid });
  if (membership) {
    const err = new Error('User is already a member of this organization');
    err.statusCode = 409;
    throw err;
  }

  const existingPending = await Invitation.findOne({
    organizationId: orgOid,
    invitedUserId: userOid,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (existingPending) {
    const err = new Error('A pending invite already exists for this user');
    err.statusCode = 409;
    throw err;
  }

  const invite = await Invitation.create({
    organizationId: orgOid,
    invitedUserId: userOid,
    invitedEmail: normalizedEmail,
    role,
    invitedByUserId: actingUserId,
    status: 'pending',
    expiresAt: expiryDateFromNow(),
  });

  await invite.populate([
    { path: 'organizationId', select: 'name' },
    { path: 'invitedByUserId', select: 'name email' },
  ]);

  return mapInvite(invite);
}

async function listPendingForOrganization(organizationId, actingUserId) {
  await organizationService.requireRole(organizationId, actingUserId, ['owner', 'admin']);

  const invites = await Invitation.find({
    organizationId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('invitedByUserId', 'name email')
    .populate('invitedUserId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  return invites.map((invite) => ({
    id: invite._id,
    invitedUser: invite.invitedUserId
      ? {
          id: invite.invitedUserId._id,
          name: invite.invitedUserId.name,
          email: invite.invitedUserId.email,
        }
      : null,
    invitedBy: invite.invitedByUserId
      ? {
          id: invite.invitedByUserId._id,
          name: invite.invitedByUserId.name,
          email: invite.invitedByUserId.email,
        }
      : null,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  }));
}

async function listMyNotifications(actingUserId) {
  const now = new Date();

  // Expire stale pending invites on read for predictable UX without a background job.
  await Invitation.updateMany(
    { invitedUserId: actingUserId, status: 'pending', expiresAt: { $lte: now } },
    { $set: { status: 'expired', respondedAt: now } }
  );

  const invites = await Invitation.find({
    invitedUserId: actingUserId,
    status: 'pending',
    expiresAt: { $gt: now },
  })
    .populate('organizationId', 'name')
    .populate('invitedByUserId', 'name email')
    .sort({ createdAt: -1 });

  const notifications = invites.map((invite) => ({
    id: invite._id,
    type: 'organization_invite',
    title: `Organization invite: ${invite.organizationId?.name || 'Organization'}`,
    message: `${invite.invitedByUserId?.name || invite.invitedByUserId?.email || 'Someone'} invited you as ${invite.role}.`,
    createdAt: invite.createdAt,
    invite: mapInvite(invite),
  }));

  return {
    unreadCount: notifications.length,
    notifications,
  };
}

async function acceptInvitation(invitationId, actingUserId) {
  const invite = await Invitation.findById(invitationId);
  if (!invite) {
    const err = new Error('Invitation not found');
    err.statusCode = 404;
    throw err;
  }

  if (String(invite.invitedUserId) !== String(actingUserId)) {
    const err = new Error('You do not have permission to accept this invitation');
    err.statusCode = 403;
    throw err;
  }

  if (invite.status !== 'pending') {
    const err = new Error(`This invitation is already ${invite.status}`);
    err.statusCode = 400;
    throw err;
  }

  if (invite.expiresAt <= new Date()) {
    invite.status = 'expired';
    invite.respondedAt = new Date();
    await invite.save();
    const err = new Error('This invitation has expired');
    err.statusCode = 400;
    throw err;
  }

  const orgId = toObjectId(invite.organizationId, 'organizationId');
  const userId = toObjectId(actingUserId, 'userId');

  const existingMembership = await Member.findOne({ organizationId: orgId, userId });
  if (!existingMembership) {
    await Member.create({
      organizationId: orgId,
      userId,
      role: invite.role,
    });
  }

  invite.status = 'accepted';
  invite.respondedAt = new Date();
  await invite.save();

  return { invitationId: invite._id, status: invite.status, organizationId: invite.organizationId };
}

async function declineInvitation(invitationId, actingUserId) {
  const invite = await Invitation.findById(invitationId);
  if (!invite) {
    const err = new Error('Invitation not found');
    err.statusCode = 404;
    throw err;
  }

  if (String(invite.invitedUserId) !== String(actingUserId)) {
    const err = new Error('You do not have permission to decline this invitation');
    err.statusCode = 403;
    throw err;
  }

  if (invite.status !== 'pending') {
    const err = new Error(`This invitation is already ${invite.status}`);
    err.statusCode = 400;
    throw err;
  }

  invite.status = 'declined';
  invite.respondedAt = new Date();
  await invite.save();

  return { invitationId: invite._id, status: invite.status };
}

async function cancelInvitation(organizationId, invitationId, actingUserId) {
  await organizationService.requireRole(organizationId, actingUserId, ['owner', 'admin']);

  const invite = await Invitation.findById(invitationId);
  if (!invite || String(invite.organizationId) !== String(organizationId)) {
    const err = new Error('Invitation not found');
    err.statusCode = 404;
    throw err;
  }

  if (invite.status !== 'pending') {
    const err = new Error(`This invitation is already ${invite.status}`);
    err.statusCode = 400;
    throw err;
  }

  invite.status = 'cancelled';
  invite.respondedAt = new Date();
  await invite.save();

  return { invitationId: invite._id, status: invite.status };
}

module.exports = {
  createInvitation,
  listPendingForOrganization,
  listMyNotifications,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
};
