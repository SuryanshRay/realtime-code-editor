import { server } from "socket.io";

const io = new Server(server, {
   cors: {
      origin: "*",
   },
});
