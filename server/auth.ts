import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router, type NextFunction, type Request, type Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { DB, Provider, UserRow } from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

// ── Passwords ────────────────────────────────────────────

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, SCRYPT);
  return timingSafeEqual(key, expected);
}

// A real hash to compare against when the email doesn't exist, so response time
// doesn't reveal which emails have accounts.
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

// ── Sessions ─────────────────────────────────────────────

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function createSession(db: DB, userId: string) {
  const token = randomBytes(32).toString("base64url");
  db.insertSession(sha256(token), userId, SESSION_TTL);
  return token;
}

export interface AuthedRequest extends Request {
  userId?: string;
  tokenHash?: string;
}

export function requireAuth(db: DB) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const hash = token ? sha256(token) : "";
    const s = hash ? db.session(hash) : undefined;
    if (!s || s.expires_at < Date.now()) {
      res.status(401).json({ error: "Please sign in again." });
      return;
    }
    req.userId = s.user_id;
    req.tokenHash = hash;
    next();
  };
}

// ── Brute-force protection ───────────────────────────────

export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  let pruned = 0;
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    // Drop stale keys now and then (not on every request), and never hold more than 50,000.
    if (hits.size > 10_000 && now - pruned > windowMs / 10) {
      pruned = now;
      for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
      // Still too many: drop the oldest keys (a Map keeps insertion order), never everyone's counters at once.
      for (const k of hits.keys()) {
        if (hits.size <= 40_000) break;
        hits.delete(k);
      }
    }
    return recent.length > max;
  };
}

/** The signed-in user for a request, if it carries a valid session (doesn't require one). */
export function optionalUser(db: DB, req: Request): string | undefined {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const s = token ? db.session(sha256(token)) : undefined;
  return s && s.expires_at >= Date.now() ? s.user_id : undefined;
}

// ── Google / Apple token verification ────────────────────

export interface IdentityClaims {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export interface AuthConfig {
  /** All OAuth client IDs whose Google tokens we accept (web, iOS, Android). */
  googleClientIds: string[];
  /** Apple audiences: the iOS bundle ID and the web Services ID. */
  appleClientIds: string[];
  googleKeys?: JWTVerifyGetKey;
  appleKeys?: JWTVerifyGetKey;
  /** Public values the app needs to start a sign-in. */
  publicConfig: { googleWebClientId?: string; googleIosClientId?: string; appleServiceId?: string; appleRedirectUrl?: string };
}

export function authConfigFromEnv(): AuthConfig {
  const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const googleWeb = process.env.GOOGLE_WEB_CLIENT_ID;
  const googleIos = process.env.GOOGLE_IOS_CLIENT_ID;
  const appleService = process.env.APPLE_SERVICE_ID;
  return {
    googleClientIds: [googleWeb, googleIos, ...list(process.env.GOOGLE_EXTRA_CLIENT_IDS)].filter(Boolean) as string[],
    appleClientIds: [process.env.APPLE_BUNDLE_ID ?? "com.caloriesdetector.app", appleService].filter(Boolean) as string[],
    publicConfig: {
      googleWebClientId: googleWeb,
      googleIosClientId: googleIos,
      appleServiceId: appleService,
      appleRedirectUrl: process.env.APPLE_REDIRECT_URL,
    },
  };
}

async function verifyGoogle(cfg: AuthConfig, idToken: string): Promise<IdentityClaims> {
  if (!cfg.googleClientIds.length) throw new HttpError(503, "Google sign-in isn't set up on this server.");
  const keys = (cfg.googleKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")));
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: cfg.googleClientIds,
  });
  return {
    subject: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

async function verifyApple(cfg: AuthConfig, idToken: string, name: string | null): Promise<IdentityClaims> {
  if (!cfg.appleClientIds.length) throw new HttpError(503, "Sign in with Apple isn't set up on this server.");
  const keys = (cfg.appleKeys ??= createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")));
  const { payload } = await jwtVerify(idToken, keys, { issuer: "https://appleid.apple.com", audience: cfg.appleClientIds });
  return {
    subject: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : null,
    // Apple sends "true" as a string.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    // Apple only shares the name with the app (not in the token), and only on first sign-in.
    name,
  };
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ── Routes ───────────────────────────────────────────────

const Email = z.string().trim().toLowerCase().email().max(254);
const Password = z.string().min(8, "Use at least 8 characters.").max(200);
const Name = z.string().trim().max(80);

function publicUser(db: DB, u: UserRow) {
  return { id: u.id, email: u.email, name: u.name, providers: db.providers(u.id), hasPassword: !!u.password_hash };
}

export function authRouter(db: DB, cfg: AuthConfig) {
  const r = Router();
  const tooManyLogins = rateLimiter(10, 15 * 60 * 1000);
  const tooManySignups = rateLimiter(20, 60 * 60 * 1000);
  // Per email regardless of IP, so rotating addresses doesn't allow unlimited guessing.
  const tooManyForEmail = rateLimiter(30, 15 * 60 * 1000);

  const ok = (res: Response, user: UserRow) => {
    res.json({ token: createSession(db, user.id), user: publicUser(db, user) });
  };

  r.get("/config", (_req, res) => {
    res.json({
      google: cfg.googleClientIds.length > 0,
      apple: cfg.appleClientIds.length > 0 && !!cfg.publicConfig.appleServiceId,
      ...cfg.publicConfig,
    });
  });

  r.post("/register", async (req, res) => {
    if (tooManySignups(req.ip ?? "")) return void res.status(429).json({ error: "Too many attempts. Try again later." });
    const parsed = z.object({ email: Email, password: Password, name: Name.optional() }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: parsed.error.issues[0].message });
    const { email, password, name } = parsed.data;
    if (db.userByEmail(email)) {
      return void res.status(409).json({ error: "An account with this email already exists. Log in instead." });
    }
    const id = randomUUID();
    const hash = await hashPassword(password);
    try {
      db.transaction(() => {
        // Checked again here: two sign-ups for the same email can race past the check above.
        if (db.userByEmail(email)) throw new Error("UNIQUE constraint failed: users.email");
        db.insertUser({ id, email, name: name || null, password_hash: hash, email_verified: 0 });
        db.linkIdentity("password", email, id);
      });
    } catch (e) {
      if (/UNIQUE/.test(String((e as Error).message))) return void res.status(409).json({ error: "An account with this email already exists. Log in instead." });
      throw e;
    }
    ok(res, db.userById(id)!);
  });

  r.post("/login", async (req, res) => {
    const parsed = z.object({ email: Email, password: z.string().max(200) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Enter your email and password." });
    const { email, password } = parsed.data;
    if (tooManyLogins(`${req.ip}|${email}`) || tooManyForEmail(email)) return void res.status(429).json({ error: "Too many attempts. Wait 15 minutes and try again." });
    const user = db.userByEmail(email);
    const valid = await verifyPassword(password, user?.password_hash ?? (await DUMMY_HASH));
    if (!user || !user.password_hash || !valid) {
      return void res.status(401).json({ error: "Wrong email or password." });
    }
    ok(res, user);
  });

  const social = (provider: Exclude<Provider, "password">) => async (req: Request, res: Response) => {
    const parsed = z.object({ idToken: z.string().min(20).max(8192), name: Name.optional() }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Missing sign-in token." });
    let claims: IdentityClaims;
    try {
      claims =
        provider === "google"
          ? await verifyGoogle(cfg, parsed.data.idToken)
          : await verifyApple(cfg, parsed.data.idToken, parsed.data.name || null);
    } catch (e) {
      if (e instanceof HttpError) return void res.status(e.status).json({ error: e.message });
      return void res.status(401).json({ error: `Couldn't verify your ${provider === "google" ? "Google" : "Apple"} sign-in. Try again.` });
    }
    const email = claims.email?.toLowerCase() ?? null;

    const userId = db.transaction(() => {
      // 1. Seen this Google/Apple account before → sign in.
      const known = db.identity(provider, claims.subject);
      if (known) {
        db.fillUser(known, claims.name, null, false);
        return known;
      }
      // 2. Verified email matches an existing account → link to it. Because the provider has proved
      //    the person owns the email, any password set by someone else on that (unverified) address
      //    is removed and its sessions are signed out, so an attacker can't pre-register a victim's email.
      const existing = email && claims.emailVerified ? db.userByEmail(email) : undefined;
      if (existing) {
        if (!existing.email_verified && existing.password_hash) {
          db.clearPassword(existing.id);
          db.deleteUserSessions(existing.id);
        }
        db.linkIdentity(provider, claims.subject, existing.id);
        db.fillUser(existing.id, claims.name, null, true);
        return existing.id;
      }
      // 3. New account. Keep the email only if it's verified and not already taken.
      const id = randomUUID();
      const safeEmail = email && claims.emailVerified && !db.userByEmail(email) ? email : null;
      db.insertUser({ id, email: safeEmail, name: claims.name, password_hash: null, email_verified: safeEmail ? 1 : 0 });
      db.linkIdentity(provider, claims.subject, id);
      return id;
    });
    ok(res, db.userById(userId)!);
  };

  r.post("/google", social("google"));
  r.post("/apple", social("apple"));

  const auth = requireAuth(db);

  r.get("/me", auth, (req: AuthedRequest, res) => {
    const user = db.userById(req.userId!);
    if (!user) return void res.status(401).json({ error: "Please sign in again." });
    res.json({ user: publicUser(db, user) });
  });

  r.post("/logout", auth, (req: AuthedRequest, res) => {
    db.deleteSession(req.tokenHash!);
    res.json({ ok: true });
  });

  // Required by the App Store: users must be able to delete their account in the app.
  r.delete("/me", auth, (req: AuthedRequest, res) => {
    db.deleteUser(req.userId!); // cascades to identities, sessions and data
    res.json({ ok: true });
  });

  return r;
}
