import express, { Request, Response } from "express";
import path from "node:path";
import { config } from "./config";
import { handleGenImage } from "./controllers/genImage";
import { handleGenText } from "./controllers/genText";
import { handleGetLogs, handleGenLog } from "./controllers/log";
import { initDb } from "./services/db";

const app = express();

app.use((req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

const staticDir = path.resolve(
  process.cwd(),
  config.nodeEnv === "production" ? "dist/public" : "public"
);
app.use(express.static(staticDir));

app.get("/getLogs", handleGetLogs);

app.get("/{*splat}", (req: Request, res: Response) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.post("/genImage", handleGenImage);
app.post("/genText", handleGenText);
app.post("/genLog", handleGenLog);

initDb().then(() => {
  app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
  });
});
