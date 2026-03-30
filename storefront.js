const express = require('express');
const router = express.Router();

// Vulnerable XSS endpoint (for demonstration only)
router.get('/api/demo/xss/vulnerable', (req, res) => {
  const username = String(req.query.username || '');
  const html = `<h1>Welcome ${username}</h1>`; // unsafe HTML injection

  res.send(html);
});

// Safe XSS endpoint (escaped)
router.get('/api/demo/xss/safe', (req, res) => {
  const username = String(req.query.username || '');
  const escapedUsername = username.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<h1>Welcome ${escapedUsername}</h1>`; // safe HTML

  res.send(html);
});

module.exports = router;
