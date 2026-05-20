import { Response } from "express";

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

export function success<T>(res: Response, data: T, msg = "ok") {
  const body: ApiResponse<T> = { code: 0, msg, data };
  res.json(body);
}

export function fail(res: Response, msg: string, code = -1) {
  const body: ApiResponse = { code, msg, data: {} };
  res.json(body);
}
