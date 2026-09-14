import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from 'path'

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
        methods: ["GET", "POST"],

  },
});

// User socket mapping
const userSocketMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || [])
    .map((socketId) => userSocketMap[socketId])
    .filter(Boolean);
}

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // Join Room
  socket.on("join", ({ roomId, userName }) => {
    if (!roomId || !userName) return;

    userSocketMap[socket.id] = userName;
    socket.join(roomId);

    const userList = getAllConnectedClients(roomId);

    // Poore room mein sabhi clients ko update bhejo (including sender)
    io.to(roomId).emit("userJoined", userList);
  });

  // Code Change
  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  // Manual Leave Room
  socket.on("leave", ({ roomId }) => {
    socket.leave(roomId);
    delete userSocketMap[socket.id];
    const userList = getAllConnectedClients(roomId);
    io.to(roomId).emit("userJoined", userList);
  });

  // ADDED: Typing listener (Sends user name correctly)
  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  // ADDED: Language change listener
  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  // Disconnect Log & Broadcast Update
  socket.on("disconnect", () => {
    console.log("user Disconnected:", socket.id);
  });

  // Disconnecting (Tab close ya refresh ke liye clean up)
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      const remainingUsers = getAllConnectedClients(roomId).filter(
        (name) => name !== userSocketMap[socket.id]
      );
      socket.in(roomId).emit("userJoined", remainingUsers);
    });
    delete userSocketMap[socket.id];
  });
});
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "frontend", "dist")));

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
