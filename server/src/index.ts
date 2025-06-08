import "dotenv/config";
import express from "express";
import { Server as WebSocketServer } from "socket.io";
import http from "http";
import cors from "cors";
import randomName from "./utils/randomName";
import { ANIME } from "@consumet/extensions";

// const CONSUMET = new ANIME.Zoro();
const CONSUMET = new ANIME.AnimePahe();

const PORT = process.env.PORT;
const ORIGIN = process.env.ORIGIN;
interface User {
  id: string;
  name: string;
  host?: boolean;
}

const userList = new Map<string, User[]>();

const app = express();
app.use(cors());
const httpServer = http.createServer(app);
const io = new WebSocketServer(httpServer, {
  cors: {
    origin: ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // console.log("Connection established")
  socket.on("joinRoom", async (roomId) => {
    await socket.join(roomId);
    if (!userList.has(roomId)) userList.set(roomId, []);
    const userArr = userList.get(roomId)!;
    const isHost = !userArr.length;
    userArr.push({
      id: socket.id,
      name: randomName(),
      host: isHost,
    });
    sendUsers(roomId);
  });

  socket.on("requestInit", (roomId) => {
    if (typeof roomId === "string")
      socket.to(roomId).emit("requestedInit", socket.id);
  });
  socket.on("sendInit", ({ uId, data }) => {
    io.to(uId).emit("receiveInit", data);
  });
  socket.on("sendVideos", ({ roomId, playlist }) => {
    if (typeof roomId === "string" && typeof playlist === "object")
      socket.to(roomId).emit("receiveVideos", playlist);
  });
  socket.on("sendDelete", ({ roomId, videoId }) => {
    if (typeof roomId === "string" && typeof videoId === "number")
      socket.to(roomId).emit("receiveDelete", videoId);
  });
  socket.on("sendActive", ({ roomId, videoId }) => {
    if (typeof roomId === "string" && typeof videoId === "number")
      socket.to(roomId).emit("receiveActive", videoId);
  });
  socket.on("sendTorrent", ({ roomId, data }) => {
    if (typeof roomId === "string")
      socket.to(roomId).emit("receiveTorrent", data);
  });
  socket.on("requestTorrent", ({ roomId }) => {
    if (typeof roomId === "string")
      socket.to(roomId).emit("sendRequestTorrent");
  });
  socket.on("requestTorrentId", ({ roomId, videoId }) => {
    if (typeof roomId === "string" && typeof videoId === "number")
      socket
        .to(roomId)
        .emit("sendRequestTorrentId", { uId: socket.id, videoId });
  });
  socket.on("sendTorrentId", ({ uId, data }) => {
    if (typeof uId === "string" && typeof data === "object")
      io.to(uId).emit("receiveTorrent", data);
  });
  socket.on("sendSync", ({ roomId, data }) => {
    if (typeof roomId === "string" && typeof data === "object")
      socket.to(roomId).emit("receiveSync", data);
  });
  socket.on("requestSync", ({ roomId }) => {
    if (typeof roomId === "string")
      socket.to(roomId).emit("sendRequestSync", socket.id);
  });
  socket.on("sendSyncId", ({ uId, data }) => {
    if (typeof uId === "string" && typeof data === "object")
      io.to(uId).emit("receiveSync", data);
  });
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    for (const id of rooms) {
      const updated = userList.get(id) || [];
      const leavingId = updated.findIndex((u) => u.id === socket.id);
      if (leavingId >= 0) {
        if (updated[leavingId].host && updated[leavingId + 1])
          updated[leavingId + 1].host = true;
        updated.splice(leavingId, 1);
      }
      if (updated.length > 0) userList.set(id, updated);
      else userList.delete(id);
      sendUsers(id);
    }
  });
});

function sendUsers(roomId: string) {
  // const sockets = await io.in(roomId).fetchSockets()
  // const users = sockets.map(s => {return {id:s.id,name:s.data.name}})

  const users = userList.get(roomId) || [];
  io.to(roomId).emit("sendUsers", users);
}

app.get("/api/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (typeof query !== "string")
      throw new Error("Wrong type of query was passed");
    const data = await CONSUMET.search(query);
    if (!data.results.length)
      return void res.status(404).send("No animes found");
    res.status(200).send(data);
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get("/api/episodes", async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== "string")
      throw new Error("Wrong type of id was passed onto query");
    const data = await CONSUMET.fetchAnimeInfo(id);
    if (!data.episodes?.length)
      return void res.status(404).send("No episodes were found");
    res.status(200).send(data.episodes);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

app.get("/api/episode", async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== "string")
      throw new Error("Wrong type of id was passed onto query");
    const data = await CONSUMET.fetchEpisodeSources(id);
    // const data = await CONSUMET.fetchEpisodeSources(id);
    // if (!data.sources.length)
    //   return void res.status(404).send("No episode found");
    res.status(200).send(data.sources);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

app.use((req, res) => {
  res.status(404).send("Wrong api path");
});

httpServer.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
// socket.on('disconnect', () => {
//     for (const [roomId,users] of userList.entries()) {
//         const leavingId = users.findIndex(u => u.id===socket.id)
//         if(leavingId>=0) {
//             const isHost = users[leavingId].host
//             users.splice(leavingId,1)
//             if (isHost && users[0]) users[0].host = true;
//             if(users.length===0) {
//                 userList.delete(roomId)
//             } else {
//                 userList.set(roomId,users)
//                 sendUsers(roomId)
//             }
//         }
//     }

// })
