import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const _dirname = path.resolve();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// Serve static files for documents (PDF, Word, TXT, Excel, PPT)
app.use("/uploads", express.static(path.join(_dirname, "uploads")));


app.use((req, res, next) => {
  req.io = server; // Attach the server instance (which has Socket.IO)
  next();
});

// Route for downloading documents (PDF, Word, TXT, Excel, PPT)
app.get("/download/document/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(_dirname, "uploads", filename);
  console.log("Debug document - Requested filename:", filename);
  console.log("Debug document - Constructed file path:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("Debug document - File does not exist:", filePath);
    return res.status(404).send("Document not found");
  }

  // Set appropriate content type based on file extension
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  const contentType = contentTypes[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(_dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(_dirname, "../frontend/dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});