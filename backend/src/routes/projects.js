const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = express.Router();

const projectInclude = {
  owner: { select: { id: true, name: true, email: true } },
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { tasks: true } },
};

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user.id } },
      },
      include: {
        ...projectInclude,
        tasks: {
          select: { status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = projects.map((p) => {
      const taskStats = {
        total: p.tasks.length,
        todo: p.tasks.filter((t) => t.status === 'TODO').length,
        inProgress: p.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        done: p.tasks.filter((t) => t.status === 'DONE').length,
      };
      const { tasks, ...rest } = p;
      return { ...rest, taskStats };
    });

    res.json({ projects: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, description } = req.body;

      const project = await prisma.project.create({
        data: {
          name,
          description: description || null,
          ownerId: req.user.id,
          members: {
            create: { userId: req.user.id, role: 'ADMIN' },
          },
        },
        include: projectInclude,
      });

      res.status(201).json({ project });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

router.get('/:projectId', requireProjectMember, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: projectInclude,
    });
    res.json({ project, membership: req.membership });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.patch(
  '/:projectId',
  requireProjectAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;

      const project = await prisma.project.update({
        where: { id: req.params.projectId },
        data,
        include: projectInclude,
      });
      res.json({ project });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

router.delete('/:projectId', requireProjectAdmin, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

router.post(
  '/:projectId/members',
  requireProjectAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['ADMIN', 'MEMBER']),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, role = 'MEMBER' } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(404).json({ error: 'User not found. They must sign up first.' });
      }

      const existing = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: req.params.projectId,
            userId: user.id,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'User is already a project member' });
      }

      const member = await prisma.projectMember.create({
        data: {
          projectId: req.params.projectId,
          userId: user.id,
          role,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      res.status(201).json({ member });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
);

router.patch(
  '/:projectId/members/:memberId',
  requireProjectAdmin,
  [body('role').isIn(['ADMIN', 'MEMBER'])],
  validate,
  async (req, res) => {
    try {
      const member = await prisma.projectMember.findFirst({
        where: {
          id: req.params.memberId,
          projectId: req.params.projectId,
        },
      });

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (member.userId === req.user.id && req.body.role !== 'ADMIN') {
        return res.status(400).json({ error: 'You cannot demote yourself' });
      }

      const updated = await prisma.projectMember.update({
        where: { id: member.id },
        data: { role: req.body.role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      res.json({ member: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }
);

router.delete(
  '/:projectId/members/:memberId',
  requireProjectAdmin,
  async (req, res) => {
    try {
      const member = await prisma.projectMember.findFirst({
        where: {
          id: req.params.memberId,
          projectId: req.params.projectId,
        },
      });

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (member.userId === req.user.id) {
        return res.status(400).json({ error: 'You cannot remove yourself from the project' });
      }

      await prisma.projectMember.delete({ where: { id: member.id } });
      res.json({ message: 'Member removed' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

module.exports = router;
