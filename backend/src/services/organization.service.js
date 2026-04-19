const Organization = require('../models/organization.model');
const Member = require('../models/member.model');
const Invitation = require('../models/invitation.model');

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function listForUser(userId) {
  const memberships = await Member.find({ userId }).select('organizationId role');
  const orgIds = memberships.map((m) => m.organizationId);

  if (!orgIds.length) {
    return [];
  }

  const orgs = await Organization.find({ _id: { $in: orgIds } }).lean();

  const roleByOrgId = memberships.reduce((acc, m) => {
    acc[m.organizationId.toString()] = m.role;
    return acc;
  }, {});

  return orgs.map((org) => ({
    ...org,
    role: roleByOrgId[org._id.toString()],
  }));
}

async function createOrganization({ name, ownerUserId }) {
  const baseSlug = toSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug uniqueness with a simple suffix strategy
  // (good enough for our use case)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Organization.findOne({ slug });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const org = await Organization.create({
    name,
    slug,
    ownerId: ownerUserId,
  });

  await Member.create({
    userId: ownerUserId,
    organizationId: org._id,
    role: 'owner',
  });

  return org.toObject();
}

async function getOrganizationForUser(orgId, userId) {
  const membership = await Member.findOne({ organizationId: orgId, userId });
  if (!membership) {
    const error = new Error('You are not a member of this organization');
    error.statusCode = 403;
    error.errorCode = 'ORG_MEMBERSHIP_REQUIRED';
    throw error;
  }

  const org = await Organization.findById(orgId);
  if (!org) {
    const error = new Error('Organization not found');
    error.statusCode = 404;
    throw error;
  }

  const obj = org.toObject();
  obj.role = membership.role;
  return obj;
}

async function requireRole(orgId, userId, allowedRoles) {
  const membership = await Member.findOne({ organizationId: orgId, userId });
  if (!membership) {
    const error = new Error('You are not a member of this organization');
    error.statusCode = 403;
    error.errorCode = 'ORG_MEMBERSHIP_REQUIRED';
    throw error;
  }

  if (!allowedRoles.includes(membership.role)) {
    const error = new Error('You do not have permission for this action');
    error.statusCode = 403;
    throw error;
  }

  return membership;
}

async function deleteOrganization(orgId, userId) {
  await requireRole(orgId, userId, ['owner']);

  await Organization.findByIdAndDelete(orgId);
  await Member.deleteMany({ organizationId: orgId });
  await Invitation.deleteMany({ organizationId: orgId });
}

async function updateOrganization(orgId, userId, { name }) {
  await requireRole(orgId, userId, ['owner', 'admin']);

  const org = await Organization.findById(orgId);
  if (!org) {
    const error = new Error('Organization not found');
    error.statusCode = 404;
    throw error;
  }

  if (name !== undefined && name.trim()) {
    org.name = name.trim();
    const baseSlug = toSlug(name);
    let slug = baseSlug;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await Organization.findOne({ slug, _id: { $ne: org._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    org.slug = slug;
  }

  await org.save();
  const membership = await Member.findOne({ organizationId: orgId, userId });
  const obj = org.toObject();
  obj.role = membership.role;
  return obj;
}

module.exports = {
  listForUser,
  createOrganization,
  getOrganizationForUser,
  updateOrganization,
  deleteOrganization,
  requireRole,
};

