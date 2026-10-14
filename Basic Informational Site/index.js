const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const routes = {
  '/': 'index.html',
  '/about': 'about.html',
  '/contact-me': 'contact-me.html',
};

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const page = routes[pathname] || '404.html';
  const statusCode = routes[pathname] ? 200 : 404;

  fs.readFile(path.join(__dirname, page), (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
