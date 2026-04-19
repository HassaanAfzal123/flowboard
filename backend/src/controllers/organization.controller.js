const organizationService = require('../services/organization.service');

async function listMyOrganizations(req, res, next) {
  try {
    const orgs = await organizationService.listForUser(req.user.id);
    return res.status(200).json({ organizations: orgs });
  } catch (err) {
    return next(err);
  }
}

async function createOrganization(req, res, next) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const org = await organizationService.createOrganization({
      name,
      ownerUserId: req.user.id,
    });

    return res.status(201).json({ organization: org });
  } catch (err) {
    return next(err);
  }
}

async function getOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const org = await organizationService.getOrganizationForUser(id, req.user.id);
    return res.status(200).json({ organization: org });
  } catch (err) {
    return next(err);
  }
}

async function deleteOrganization(req, res, next) {
  try {
    const { id } = req.params;
    await organizationService.deleteOrganization(id, req.user.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function updateOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const organization = await organizationService.updateOrganization(id, req.user.id, { name });
    return res.status(200).json({ organization });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMyOrganizations,
  createOrganization,
  getOrganization,
  updateOrganization,
  deleteOrganization,
};

