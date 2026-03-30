const express = require('express');
const router = express.Router();

// Vulnerable XSS endpoint in backend module
router.get('/api/demo/xss/backend-vulnerable', (req, res) => {
  const comment = String(req.query.comment || '');
  const html = `<div>User comment: ${comment}</div>`; // unsafe HTML injection

  res.contentType('text/plain').send(html);
});

// Safe XSS endpoint in backend module
router.get('/api/demo/xss/backend-safe', (req, res) => {
  const comment = String(req.query.comment || '');
  const escapedComment = comment.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<div>User comment: ${escapedComment}</div>`; // safe HTML

  res.contentType('text/plain').send(html);
});

module.exports = router;
