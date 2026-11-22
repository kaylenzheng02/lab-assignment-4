// Aquarium server (http://localhost:3001)
// Receives fish from the drawing server and shows them on every open aquarium.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = 3001;
const MAX_FISH = 20; // when the tank is full, the oldest fish leaves

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("aquarium"));
app.use(express.json({ limit: "2mb" })); // fish arrive as image data

// Every fish in the tank, stored as a PNG image (data URL)
const fishInTank = [];

// The drawing server sends each released fish here
app.post("/fish", (req, res) => {
  const image = req.body?.image;

  const isPng = typeof image === "string" && image.startsWith("data:image/png");
  if (!isPng) return res.sendStatus(400);

  fishInTank.push(image);
  if (fishInTank.length > MAX_FISH) fishInTank.shift();

  io.emit("new-fish", image);
  res.sendStatus(201);
});

// Someone opened the aquarium: send them every fish already swimming
io.on("connection", (socket) => {
  socket.emit("all-fish", fishInTank);
});

server.listen(PORT, () => {
  console.log(`Aquarium: http://localhost:${PORT}`);
});
