const mongoose = require('mongoose');
const Member = require('../models/member.model');
const Organization = require('../models/organization.model');
const organizationService = require('./organization.service');
const invitationService = require('./invitation.service');

const ROLES = ['owner', 'admin', 'member'];

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

async function listMembers(organizationId, actingUserId) {
  // Any member can view the member list
  await organizationService.getOrganizationForUser(organizationId, actingUserId);

  const members = await Member.find({ organizationId })
    .populate('userId', 'name email')
    .lean();

  return members.map((m) => ({
    id: m._id,
    user: m.userId,
    role: m.role,
    createdAt: m.createdAt,
  }));
}

async function inviteMember(organizationId, actingUserId, email, role = 'member') {
  return invitationService.createInvitation(organizationId, actingUserId, email, role);
}

async function updateMemberRole(organizationId, actingUserId, memberUserId, role) {
  // Only owner can change roles
  await organizationService.requireRole(organizationId, actingUserId, ['owner']);

  if (!ROLES.includes(role)) {
    const error = new Error('Invalid role');
    error.statusCode = 400;
    throw error;
  }

  const membership = await Member.findOne({ organizationId, userId: memberUserId });
  if (!membership) {
    const error = new Error('Member not found in this organization');
    error.statusCode = 404;
    throw error;
  }

  // Never leave the organization with zero owners: cannot demote the last owner via role edit.
  // Use transferOwnership to hand ownership to another member first.
  if (membership.role === 'owner' && role !== 'owner') {
    const ownerCount = await Member.countDocuments({ organizationId, role: 'owner' });
    if (ownerCount <= 1) {
      const error = new Error(
        'Cannot remove the last owner. Transfer ownership to another member first.'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  membership.role = role;
  await membership.save();

  return {
    id: membership._id,
    userId: membership.userId,
    role: membership.role,
    updatedAt: membership.updatedAt,
  };
}

/**
 * Current owner passes ownership to another member; previous owner becomes admin.
 * Does not remove the previous owner from the organization.
 * Updates Organization.ownerId to stay consistent.
 */
async function transferOwnership(organizationId, actingUserId, newOwnerUserId) {
  await organizationService.requireRole(organizationId, actingUserId, ['owner']);

  if (actingUserId.toString() === newOwnerUserId.toString()) {
    const error = new Error('Choose another member to receive ownership');
    error.statusCode = 400;
    throw error;
  }

  const orgOid = toObjectId(organizationId, 'organizationId');
  const actorOid = toObjectId(actingUserId, 'userId');
  const newOwnerOid = toObjectId(newOwnerUserId, 'userId');

  // Resolve your membership first so we never promote the new owner without demoting you
  const previous = await Member.findOne({ organizationId: orgOid, userId: actorOid });
  if (!previous) {
    const error = new Error('Your membership in this organization could not be found');
    error.statusCode = 500;
    throw error;
  }
  if (previous.role !== 'owner') {
    const error = new Error('Only an owner can transfer ownership');
    error.statusCode = 403;
    throw error;
  }

  const incoming = await Member.findOne({ organizationId: orgOid, userId: newOwnerOid });
  if (!incoming) {
    const error = new Error('That user is not a member of this organization');
    error.statusCode = 404;
    throw error;
  }

  const org = await Organization.findById(orgOid);
  if (!org) {
    const error = new Error('Organization not found');
    error.statusCode = 404;
    throw error;
  }

  previous.role = 'admin';
  await previous.save();

  incoming.role = 'owner';
  await incoming.save();

  org.ownerId = newOwnerOid;
  await org.save();

  return {
    organization: org.toObject(),
    previousOwnerId: actingUserId,
    newOwnerId: newOwnerUserId,
  };
}

async function removeMember(organizationId, actingUserId, memberUserId) {
  // Only owner/admin can remove members; only owner can remove admins/owners (we simplify to owner only here)
  await organizationService.requireRole(organizationId, actingUserId, ['owner', 'admin']);

  if (String(actingUserId) === String(memberUserId)) {
    const error = new Error(
      'Use the dedicated leave action to remove yourself from an organization'
    );
    error.statusCode = 400;
    throw error;
  }

  const membership = await Member.findOne({ organizationId, userId: memberUserId });
  if (!membership) {
    const error = new Error('Member not found in this organization');
    error.statusCode = 404;
    throw error;
  }

  // Prevent removing the last owner (simple rule for now)
  if (membership.role === 'owner') {
    const ownerCount = await Member.countDocuments({ organizationId, role: 'owner' });
    if (ownerCount <= 1) {
      const error = new Error('Cannot remove the last owner of the organization');
      error.statusCode = 400;
      throw error;
    }
  }

  await Member.deleteOne({ _id: membership._id });
}

async function leaveOrganization(organizationId, actingUserId) {
  const membership = await Member.findOne({ organizationId, userId: actingUserId });
  if (!membership) {
    const error = new Error('You are not a member of this organization');
    error.statusCode = 403;
    error.errorCode = 'ORG_MEMBERSHIP_REQUIRED';
    throw error;
  }

  if (membership.role === 'owner') {
    const ownerCount = await Member.countDocuments({ organizationId, role: 'owner' });
    if (ownerCount <= 1) {
      const error = new Error(
        'You are the last owner. Transfer ownership before leaving the organization.'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  await Member.deleteOne({ _id: membership._id });
}

module.exports = {
  listMembers,
  inviteMember,
  updateMemberRole,
  transferOwnership,
  removeMember,
  leaveOrganization,
};

