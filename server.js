// Drawing server (http://localhost:3000)
// Serves the drawing page and keeps every open drawing board in sync.
// When someone releases their fish, it is passed on to the aquarium server.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// On a host like Render these come from the service's settings;
// on your own computer the defaults are used.
const PORT = process.env.PORT || 3000;
const AQUARIUM_URL = process.env.AQUARIUM_URL || "http://localhost:3001";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// The home page opens the drawing board (the text editor is still at /index.html)
app.get("/", (req, res) => res.redirect("/draw.html"));

// The "Open aquarium" link goes here, so it works both locally and online
app.get("/aquarium", (req, res) => res.redirect(AQUARIUM_URL));

app.use(express.static("public"));

// Everything drawn on each board (lines, patterns and eyes),
// so people who join later see the same picture
const boards = {};

io.on("connection", (socket) => {
  // ---- Text editor (index.html) ----
  socket.on("join-room", (room) => {
    socket.join(room);
  });

  socket.on("edit", ({ room, data }) => {
    socket.to(room).emit("edit", data);
  });

  // ---- Drawing board (draw.html) ----
  socket.on("join-board", (room) => {
    socket.join(room);
    socket.emit("history", boards[room] || []);
  });

  socket.on("draw", ({ room, item }) => {
    if (!boards[room]) boards[room] = [];
    boards[room].push(item);
    socket.to(room).emit("draw", item);
  });

  socket.on("clear", (room) => {
    boards[room] = [];
    io.to(room).emit("clear");
  });

  // reply(true) tells the drawing page the fish made it to the aquarium
  socket.on("release", async ({ image }, reply) => {
    const arrived = await sendToAquarium(image);
    reply(arrived);
  });
});

async function sendToAquarium(image) {
  try {
    const response = await fetch(`${AQUARIUM_URL}/fish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    return response.ok;
  } catch {
    console.log(`Could not reach the aquarium at ${AQUARIUM_URL}`);
    return false;
  }
}

server.listen(PORT, () => {
  console.log(`Drawing board: http://localhost:${PORT}/draw.html`);
});
