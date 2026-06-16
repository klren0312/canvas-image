import { Request, Response } from "express";
import { success, fail } from "../response";
import { genImage } from "../services/genImage";

export async function handleGenImage(req: Request, res: Response) {
  try {
    const { prompt, size } = req.body;
    if (!prompt) {
      fail(res, "prompt is required");
      return;
    }
    const image = await genImage(prompt, size);
    success(res, { image });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
}
