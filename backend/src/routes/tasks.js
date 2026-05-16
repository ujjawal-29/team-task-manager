const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

router.use(authenticate);

router.get('/:projectId/tasks', requireProjectMember, async (req, res) => {
  try {
    const { status, assigneeId } = req.query;
    const where = { projectId: req.params.projectId };

    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post(
  '/:projectId/tasks',
  requireProjectMember,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
    body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
    body('assigneeId').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, status, dueDate, assigneeId } = req.body;

      if (assigneeId) {
        const assigneeMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: req.params.projectId,
              userId: assigneeId,
            },
          },
        });
        if (!assigneeMember) {
          return res.status(400).json({ error: 'Assignee must be a project member' });
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description: description || null,
          status: status || 'TODO',
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId: req.params.projectId,
          assigneeId: assigneeId || null,
          createdById: req.user.id,
        },
        include: taskInclude,
      });

      res.status(201).json({ task });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

router.get('/:projectId/tasks/:taskId', requireProjectMember, async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        projectId: req.params.projectId,
      },
      include: taskInclude,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.patch(
  '/:projectId/tasks/:taskId',
  requireProjectMember,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('assigneeId').optional({ nullable: true }).isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const task = await prisma.task.findFirst({
        where: {
          id: req.params.taskId,
          projectId: req.params.projectId,
        },
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const isAdmin = req.membership?.role === 'ADMIN';
      const isAssignee = task.assigneeId === req.user.id;
      const isCreator = task.createdById === req.user.id;

      if (!isAdmin && !isAssignee && !isCreator) {
        return res.status(403).json({
          error: 'Only admins, assignees, or task creators can update this task',
        });
      }

      const { title, description, status, dueDate, assigneeId } = req.body;
      const data = {};

      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (status !== undefined) data.status = status;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

      if (assigneeId !== undefined) {
        if (assigneeId && !isAdmin) {
          return res.status(403).json({ error: 'Only admins can reassign tasks' });
        }
        if (assigneeId) {
          const assigneeMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId: req.params.projectId,
                userId: assigneeId,
              },
            },
          });
          if (!assigneeMember) {
            return res.status(400).json({ error: 'Assignee must be a project member' });
          }
        }
        data.assigneeId = assigneeId || null;
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data,
        include: taskInclude,
      });

      res.json({ task: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

router.delete(
  '/:projectId/tasks/:taskId',
  requireProjectAdmin,
  async (req, res) => {
    try {
      const task = await prisma.task.findFirst({
        where: {
          id: req.params.taskId,
          projectId: req.params.projectId,
        },
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await prisma.task.delete({ where: { id: task.id } });
      res.json({ message: 'Task deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
);

module.exports = router;
