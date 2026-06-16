import { Request, Response } from "express";
import { success, fail } from "../response";
import { insertLog, queryLogs } from "../services/db";

export function handleGetLogs(req: Request, res: Response) {
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
}

export function handleGenLog(req: Request, res: Response) {
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
}
