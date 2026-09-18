const express = require('/mnt/c/Projects/FresherFlow/apps/mcp/node_modules/express');
const app = express();
app.use(express.json({ limit: '300kb' }));
app.post('/mcp', (req, res) => {
  console.log('content-type:', req.headers['content-type']);
  console.log('body type:', typeof req.body, '| body:', JSON.stringify(req.body));
  res.json({ echo: req.body });
});
app.listen(5300, () => console.log('dbg on 5300'));
