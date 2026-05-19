import express, { Request, Response } from "express";
import { config } from "./config";

const app = express();

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + TypeScript!" });
});

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
});
