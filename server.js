const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const PORT = 3000;
const DEADLINE_MS = 86400_000;

app.use(express.static("public"));

let db;

(async () => {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS crimes (
      id INTEGER PRIMARY KEY,
      text TEXT,
      name TEXT,
      createdAt TEXT,
      closeAt TEXT,
      guilty INTEGER DEFAULT 0,
      innocent INTEGER DEFAULT 0,
      sympathy INTEGER DEFAULT 0,
      votedGI TEXT DEFAULT '{}',
      votedSym TEXT DEFAULT '[]',
      comments TEXT DEFAULT '[]',
      status TEXT DEFAULT 'open',
      verdict TEXT,
      guiltyRate REAL,
      judgedAt TEXT
    )
  `);
  
  const openCrimes = await db.all("SELECT * FROM crimes WHERE status = 'open'");
  openCrimes.forEach(c => scheduleJudgment(c.id, c.closeAt));
})();

function nowMs() {
  return Date.now();
}

async function scheduleJudgment(crimeId, closeAt) {
  const closeMs = new Date(closeAt).getTime();
  const delay = Math.max(0, closeMs - nowMs());

  setTimeout(async () => {
    const c = await db.get("SELECT * FROM crimes WHERE id = ?", crimeId);
    if (!c || c.status === "judged") return;

    const total = c.guilty + c.innocent;
    const guiltyRate = total > 0 ? c.guilty / total : 0.5;
    const verdict = Math.random() < guiltyRate ? "guilty" : "innocent";

    await db.run(
      `UPDATE crimes SET status = 'judged', guiltyRate = ?, verdict = ?, judgedAt = ? WHERE id = ?`,
      [guiltyRate, verdict, new Date().toISOString(), crimeId]
    );

    const allCrimes = await getAllCrimes();
    io.emit("updateCrimes", allCrimes);
  }, delay);
}

async function getAllCrimes() {
  const data = await db.all("SELECT * FROM crimes ORDER BY createdAt DESC");
  return data.map(c => ({
    ...c,
    votedGI: JSON.parse(c.votedGI),
    votedSym: JSON.parse(c.votedSym),
    comments: JSON.parse(c.comments)
  }));
}

io.on("connection", async (socket) => {
  console.log("👥 Connected:", socket.id);

  socket.emit("updateCrimes", await getAllCrimes());

  socket.on("newCrime", async (data) => {
    const text = (data?.text || "").trim();
    const name = (data?.name || "名無し").trim();
    if (!text) return;

    const id = Date.now();
    const createdAt = new Date().toISOString();
    const closeAt = new Date(Date.now() + DEADLINE_MS).toISOString();

    await db.run(
      `INSERT INTO crimes (id, text, name, createdAt, closeAt, votedGI, votedSym, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, text, name, createdAt, closeAt, '{}', '[]', '[]']
    );

    scheduleJudgment(id, closeAt);
    io.emit("updateCrimes", await getAllCrimes());
  });

  socket.on("getCrimeDetail", async (id) => {
    const c = await db.get("SELECT * FROM crimes WHERE id = ?", id);
    if (!c) return;
    
    socket.emit("crimeDetail", {
      ...c,
      votedGI: JSON.parse(c.votedGI),
      votedSym: JSON.parse(c.votedSym),
      comments: JSON.parse(c.comments)
    });
  });

  socket.on("newComment", async ({ crimeId, text }) => {
    const c = await db.get("SELECT * FROM crimes WHERE id = ?", crimeId);
    if (!c) return;

    const t = (text || "").trim();
    if (!t) return;

    const comments = JSON.parse(c.comments);
    comments.push(t);

    await db.run("UPDATE crimes SET comments = ? WHERE id = ?", [JSON.stringify(comments), crimeId]);
    io.emit("updateComments", { crimeId, comments });
  });

  socket.on("vote", async ({ id, type }) => {
    const c = await db.get("SELECT * FROM crimes WHERE id = ?", id);
    if (!c) return;

    const isClosed = nowMs() >= new Date(c.closeAt).getTime() || c.status === "judged";

    if (type === "guilty" || type === "innocent") {
      if (isClosed) return;
      const votedGI = JSON.parse(c.votedGI);
      if (votedGI[socket.id]) return;

      votedGI[socket.id] = type;
      const newVal = (type === "guilty" ? c.guilty : c.innocent) + 1;
      const column = type === "guilty" ? "guilty" : "innocent";

      await db.run(
        `UPDATE crimes SET ${column} = ?, votedGI = ? WHERE id = ?`,
        [newVal, JSON.stringify(votedGI), id]
      );
    }

    if (type === "sympathy") {
      const votedSym = JSON.parse(c.votedSym);
      if (votedSym.includes(socket.id)) return;
      votedSym.push(socket.id);

      await db.run(
        `UPDATE crimes SET sympathy = ?, votedSym = ? WHERE id = ?`,
        [c.sympathy + 1, JSON.stringify(votedSym), id]
      );
    }

    io.emit("updateCrimes", await getAllCrimes());
  });
});

http.listen(PORT, () => {
  console.log(`⚖️ Internet Court running with SQLite → http://localhost:${PORT}`);
});