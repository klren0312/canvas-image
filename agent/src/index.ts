import express, { Request, Response } from "express";
import path from "node:path";
import { config } from "./config";
import { success, fail } from "./response";
import { genImage } from "./services/genImage";
import { genText } from "./services/genText";
import { initDb, insertLog, queryLogs } from "./services/db";

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

app.get("/getLogs", (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
    const search = req.query.search as string | undefined;
    const result = queryLogs({ page, pageSize, search });
    success(res, result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
});

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
    const { elements, usage } = await genText(prompt);
    success(res, { elements, usage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
});

app.post("/genLog", (req: Request, res: Response) => {
  try {
    const { prompt, textResult, imageResults, tokensPrompt, tokensCompletion, tokensTotal } = req.body;
    if (!prompt) {
      fail(res, "prompt is required");
      return;
    }
    insertLog({
      prompt,
      textResult: JSON.stringify(textResult),
      imageResults: JSON.stringify(imageResults ?? []),
      tokensPrompt,
      tokensCompletion,
      tokensTotal,
    });
    success(res, { logged: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
});

initDb().then(() => {
  app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
  });
});
