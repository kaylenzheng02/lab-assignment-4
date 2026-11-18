const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // serves public/index.html

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  // Join a shared room (e.g. one document or board)
  socket.on("join-room", (room) => {
    socket.join(room);
    socket.to(room).emit("user-joined", socket.id);
  });

  // Relay edits to everyone else in the room
  socket.on("edit", ({ room, data }) => {
    socket.to(room).emit("edit", data);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

server.listen(3000, () => console.log("http://localhost:3000"));
