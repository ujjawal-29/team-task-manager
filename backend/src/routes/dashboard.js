const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    if (projectIds.length === 0) {
      return res.json({
        summary: {
          totalProjects: 0,
          totalTasks: 0,
          myTasks: 0,
          overdue: 0,
          byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
        },
        recentTasks: [],
        overdueTasks: [],
        myTasks: [],
      });
    }

    const [allTasks, myAssignedTasks, overdueTasks, recentTasks] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        select: { status: true },
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          assigneeId: userId,
          status: { not: 'DONE' },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    const byStatus = {
      TODO: allTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      DONE: allTasks.filter((t) => t.status === 'DONE').length,
    };

    res.json({
      summary: {
        totalProjects: projectIds.length,
        totalTasks: allTasks.length,
        myTasks: myAssignedTasks.length,
        overdue: overdueTasks.length,
        byStatus,
      },
      recentTasks,
      overdueTasks,
      myTasks: myAssignedTasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
