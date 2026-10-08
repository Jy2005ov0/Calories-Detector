import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Provider = "password" | "google" | "apple";

export interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  password_hash: string | null;
  email_verified: number;
  created_at: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE COLLATE NOCASE,
  name TEXT,
  password_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
-- One row per way of signing in (a user can have password + Google + Apple).
CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS identities_user ON identities(user_id);
-- Only a SHA-256 of each session token is stored, so a leaked database can't be used to sign in.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
-- The user's app data (logs, workouts, foods, profile) as one JSON document.
CREATE TABLE IF NOT EXISTS user_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export type DB = ReturnType<typeof openDb>;

export function openDb(file = process.env.DATABASE_PATH ?? path.resolve("data/app.db")) {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  const q = {
    userById: db.prepare("SELECT * FROM users WHERE id = ?"),
    userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
    insertUser: db.prepare("INSERT INTO users (id, email, name, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)"),
    updateUser: db.prepare("UPDATE users SET name = COALESCE(name, ?), email = COALESCE(email, ?), email_verified = MAX(email_verified, ?) WHERE id = ?"),
    clearPassword: db.prepare("UPDATE users SET password_hash = NULL WHERE id = ?"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    identity: db.prepare("SELECT user_id FROM identities WHERE provider = ? AND subject = ?"),
    insertIdentity: db.prepare("INSERT OR IGNORE INTO identities (provider, subject, user_id) VALUES (?, ?, ?)"),
    providers: db.prepare("SELECT provider FROM identities WHERE user_id = ? ORDER BY provider"),
    insertSession: db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"),
    session: db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?"),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
    deleteUserSessions: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
    purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at < ?"),
    getData: db.prepare("SELECT version, data, updated_at FROM user_data WHERE user_id = ?"),
    insertData: db.prepare("INSERT INTO user_data (user_id, version, data, updated_at) VALUES (?, 1, ?, ?)"),
    // Optimistic concurrency: only writes if the client saw the latest version.
    updateData: db.prepare("UPDATE user_data SET version = version + 1, data = ?, updated_at = ? WHERE user_id = ? AND version = ?"),
  };

  return {
    raw: db,
    transaction<T>(fn: () => T): T {
      db.exec("BEGIN IMMEDIATE");
      try {
        const out = fn();
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    userById: (id: string) => q.userById.get(id) as UserRow | undefined,
    userByEmail: (email: string) => q.userByEmail.get(email) as UserRow | undefined,
    insertUser: (u: Omit<UserRow, "created_at">) =>
      q.insertUser.run(u.id, u.email, u.name, u.password_hash, u.email_verified, Date.now()),
    fillUser: (id: string, name: string | null, email: string | null, verified: boolean) =>
      q.updateUser.run(name, email, verified ? 1 : 0, id),
    clearPassword: (id: string) => q.clearPassword.run(id),
    deleteUser: (id: string) => q.deleteUser.run(id),
    identity: (provider: Provider, subject: string) => (q.identity.get(provider, subject) as { user_id: string } | undefined)?.user_id,
    linkIdentity: (provider: Provider, subject: string, userId: string) => q.insertIdentity.run(provider, subject, userId),
    providers: (userId: string) => (q.providers.all(userId) as { provider: Provider }[]).map((r) => r.provider),
    insertSession: (hash: string, userId: string, ttlMs: number) => q.insertSession.run(hash, userId, Date.now(), Date.now() + ttlMs),
    session: (hash: string) => q.session.get(hash) as { user_id: string; expires_at: number } | undefined,
    deleteSession: (hash: string) => q.deleteSession.run(hash),
    deleteUserSessions: (userId: string) => q.deleteUserSessions.run(userId),
    purgeSessions: () => q.purgeSessions.run(Date.now()),
    getData: (userId: string) => q.getData.get(userId) as { version: number; data: string; updated_at: number } | undefined,
    insertData: (userId: string, data: string) => q.insertData.run(userId, data, Date.now()),
    updateData: (userId: string, data: string, baseVersion: number) =>
      Number(q.updateData.run(data, Date.now(), userId, baseVersion).changes) === 1,
  };
}
