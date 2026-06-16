import { Request, Response } from "express";
import { success, fail } from "../response";
import { genText } from "../services/genText";

export async function handleGenText(req: Request, res: Response) {
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
}
