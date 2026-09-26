// Tiny static server for the "http" test project and for trying the
// board the way GitHub Pages serves it (a real origin: referrer sent,
// storage per origin, no file:// quirks). No dependencies.
//   node tools/serve.js [port]   -> http://localhost:4173/Deckhand_v6.html
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const port = +(process.argv[2] || process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".md": "text/markdown; charset=utf-8", ".css": "text/css" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.normalize(path.join(root, p));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, () => console.log("Deckhand at http://localhost:" + port + "/Deckhand_v6.html"));
