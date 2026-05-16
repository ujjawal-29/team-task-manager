const prisma = require('../lib/prisma');

async function getMembership(projectId, userId) {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });
}

async function requireProjectMember(req, res, next) {
  const { projectId } = req.params;
  const membership = await getMembership(projectId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  req.membership = membership;
  next();
}

async function requireProjectAdmin(req, res, next) {
  const { projectId } = req.params;
  const membership = await getMembership(projectId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  if (membership.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.membership = membership;
  next();
}

module.exports = { requireProjectMember, requireProjectAdmin, getMembership };
