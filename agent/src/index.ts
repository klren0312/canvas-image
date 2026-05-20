import express, { Request, Response } from "express";
import { config } from "./config";
import { success, fail } from "./response";
import { genImage } from "./services/genImage";

const app = express();

app.use(express.json());

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

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
});
