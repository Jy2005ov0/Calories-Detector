import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "./auth";
import type { DB } from "./db";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * One JSON document per user. Writes carry the version the client last saw; if another
 * device wrote in between, the server answers 409 with its copy so the client can merge
 * and retry instead of silently overwriting.
 */
export function syncRouter(db: DB) {
  const r = Router();
  r.use(requireAuth(db));

  const current = (res: Response, userId: string, status = 200) => {
    const row = db.getData(userId);
    res.status(status).json(row ? { version: row.version, data: JSON.parse(row.data), updatedAt: row.updated_at } : { version: 0, data: null, updatedAt: null });
  };

  r.get("/", (req: AuthedRequest, res) => current(res, req.userId!));

  r.put("/", (req: AuthedRequest, res) => {
    const parsed = z.object({ baseVersion: z.number().int().min(0), data: z.record(z.string(), z.unknown()) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid data." });
    const json = JSON.stringify(parsed.data.data);
    if (Buffer.byteLength(json) > MAX_BYTES) return void res.status(413).json({ error: "Your data is too large to sync." });
    const userId = req.userId!;
    const saved = db.transaction(() => {
      const row = db.getData(userId);
      if (!row) {
        if (parsed.data.baseVersion !== 0) return false;
        db.insertData(userId, json);
        return true;
      }
      return db.updateData(userId, json, parsed.data.baseVersion);
    });
    current(res, userId, saved ? 200 : 409);
  });

  return r;
}
