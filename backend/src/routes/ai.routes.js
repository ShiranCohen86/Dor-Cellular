const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const asyncHandler = require('../utils/asyncHandler');
const { runChat, deployProject } = require('../services/ai.service');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// POST /api/admin/ai/chat — streams SSE events
router.post('/chat', asyncHandler(async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'messages array required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const changedFiles = await runChat(messages, emit);
    emit({ type: 'done', changedFiles });
  } catch (err) {
    emit({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
}));

// POST /api/admin/ai/deploy
router.post('/deploy', asyncHandler(async (req, res) => {
  const { commitMessage } = req.body;
  if (!commitMessage || typeof commitMessage !== 'string') {
    return res.status(400).json({ message: 'commitMessage required' });
  }
  const results = await deployProject(commitMessage);
  const ok = results.every((r) => r.ok);
  res.status(ok ? 200 : 500).json({ ok, results });
}));

module.exports = router;
