import express, { Request, Response } from "express";
import path from "node:path";
import { config } from "./config";
import { success, fail } from "./response";
import { genImage } from "./services/genImage";
import { genText } from "./services/genText";

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

app.get("/{*splat}", (req: Request, res: Response) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.post("/genImage", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      fail(res, "prompt is required");
      return;
    }
    const image = await genImage(prompt);
    success(res, { image });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
});

app.post("/genText", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      fail(res, "prompt is required");
      return;
    }
    const elements = await genText(prompt);
    success(res, { elements });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
});

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
});
