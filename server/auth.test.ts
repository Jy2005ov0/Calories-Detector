import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createApp } from "./index";
import { openDb } from "./db";
import { hashPassword, verifyPassword } from "./auth";

// Stand-in Google and Apple signing keys, so the real verification code path runs.
let googleKey: CryptoKey, appleKey: CryptoKey, otherKey: CryptoKey;
let server: Server;
let base = "";
const db = openDb(":memory:");

beforeAll(async () => {
  const g = await generateKeyPair("RS256");
  const a = await generateKeyPair("RS256");
  otherKey = (await generateKeyPair("RS256")).privateKey;
  googleKey = g.privateKey;
  appleKey = a.privateKey;
  const jwks = async (pub: CryptoKey, kid: string) => createLocalJWKSet({ keys: [{ ...(await exportJWK(pub)), kid, alg: "RS256" }] });
  const app = createApp(db, {
    googleClientIds: ["web-client.apps.googleusercontent.com", "ios-client.apps.googleusercontent.com"],
    appleClientIds: ["com.caloriesdetector.app", "com.caloriesdetector.web"],
    googleKeys: await jwks(g.publicKey, "g1"),
    appleKeys: await jwks(a.publicKey, "a1"),
    publicConfig: { googleWebClientId: "web-client.apps.googleusercontent.com", appleServiceId: "com.caloriesdetector.web" },
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

const googleToken = (claims: Record<string, unknown>, opts: { key?: CryptoKey; aud?: string; iss?: string; exp?: string } = {}) =>
  new SignJWT({ email_verified: true, ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "g1" })
    .setIssuer(opts.iss ?? "https://accounts.google.com")
    .setAudience(opts.aud ?? "web-client.apps.googleusercontent.com")
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "1h")
    .sign(opts.key ?? googleKey);

const appleToken = (claims: Record<string, unknown>, aud = "com.caloriesdetector.app") =>
  new SignJWT({ email_verified: "true", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "a1" })
    .setIssuer("https://appleid.apple.com")
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(appleKey);

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("correct horse");
    const b = await hashPassword("correct horse");
    expect(a).not.toBe(b);
    expect(a).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", a)).toBe(true);
    expect(await verifyPassword("wrong horse", a)).toBe(false);
  });
});

describe("email accounts", () => {
  it("registers, signs in, and reads the profile", async () => {
    const reg = await call("POST", "/api/auth/register", { email: "Aiman@Example.com ", password: "hunter2hunter2", name: "Aiman" });
    expect(reg.status).toBe(200);
    expect(reg.body.user).toMatchObject({ email: "aiman@example.com", name: "Aiman", providers: ["password"], hasPassword: true });
    expect(reg.body.user.password_hash).toBeUndefined();

    const me = await call("GET", "/api/auth/me", undefined, reg.body.token);
    expect(me.body.user.email).toBe("aiman@example.com");

    const login = await call("POST", "/api/auth/login", { email: "AIMAN@example.com", password: "hunter2hunter2" });
    expect(login.status).toBe(200);
    expect(login.body.token).not.toBe(reg.body.token);
  });

  it("rejects duplicates, short passwords and bad emails", async () => {
    expect((await call("POST", "/api/auth/register", { email: "aiman@example.com", password: "another-pass" })).status).toBe(409);
    expect((await call("POST", "/api/auth/register", { email: "x@example.com", password: "short" })).body.error).toMatch(/8 characters/);
    expect((await call("POST", "/api/auth/register", { email: "not-an-email", password: "longenough" })).status).toBe(400);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrong = await call("POST", "/api/auth/login", { email: "aiman@example.com", password: "nope-nope" });
    const unknown = await call("POST", "/api/auth/login", { email: "nobody@example.com", password: "nope-nope" });
    expect(wrong).toEqual({ status: 401, body: { error: "Wrong email or password." } });
    expect(unknown).toEqual(wrong);
  });

  it("locks out password guessing after 10 tries", async () => {
    await call("POST", "/api/auth/register", { email: "target@example.com", password: "real-password" });
    for (let i = 0; i < 10; i++) await call("POST", "/api/auth/login", { email: "target@example.com", password: `guess-${i}` });
    const blocked = await call("POST", "/api/auth/login", { email: "target@example.com", password: "real-password" });
    expect(blocked.status).toBe(429);
  });

  it("signs out by revoking the session", async () => {
    const { body } = await call("POST", "/api/auth/register", { email: "out@example.com", password: "password123" });
    expect((await call("POST", "/api/auth/logout", {}, body.token)).status).toBe(200);
    expect((await call("GET", "/api/auth/me", undefined, body.token)).status).toBe(401);
  });

  it("rejects missing and made-up tokens", async () => {
    expect((await call("GET", "/api/auth/me")).status).toBe(401);
    expect((await call("GET", "/api/auth/me", undefined, "made-up-token")).status).toBe(401);
  });
});

describe("Google and Apple", () => {
  it("creates an account from a Google token and signs back in to the same one", async () => {
    const t = await googleToken({ sub: "g-123", email: "mei@gmail.com", name: "Mei Ling" });
    const first = await call("POST", "/api/auth/google", { idToken: t });
    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({ email: "mei@gmail.com", name: "Mei Ling", providers: ["google"], hasPassword: false });
    const again = await call("POST", "/api/auth/google", { idToken: await googleToken({ sub: "g-123", email: "mei@gmail.com" }, { aud: "ios-client.apps.googleusercontent.com" }) });
    expect(again.body.user.id).toBe(first.body.user.id);
  });

  it("rejects forged, expired, wrong-audience and wrong-issuer Google tokens", async () => {
    const claims = { sub: "g-evil", email: "evil@gmail.com" };
    for (const t of [
      await googleToken(claims, { key: otherKey }),
      await googleToken(claims, { aud: "someone-elses-app" }),
      await googleToken(claims, { iss: "https://evil.example" }),
      await googleToken(claims, { exp: "-1m" }),
      "not.a.jwt.at.all.but.long.enough",
    ]) {
      const r = await call("POST", "/api/auth/google", { idToken: t });
      expect(r.status).toBe(401);
    }
  });

  it("Sign in with Apple keeps the name the app passes on first sign-in", async () => {
    const r = await call("POST", "/api/auth/apple", { idToken: await appleToken({ sub: "a-1", email: "x1y2@privaterelay.appleid.com" }), name: "Farid" });
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ name: "Farid", email: "x1y2@privaterelay.appleid.com", providers: ["apple"] });
    const web = await call("POST", "/api/auth/apple", { idToken: await appleToken({ sub: "a-1" }, "com.caloriesdetector.web") });
    expect(web.body.user.id).toBe(r.body.user.id);
    expect(web.body.user.name).toBe("Farid");
  });

  it("links Google to an existing account with the same verified email", async () => {
    const pw = await call("POST", "/api/auth/register", { email: "link@example.com", password: "password123" });
    const g = await call("POST", "/api/auth/google", { idToken: await googleToken({ sub: "g-link", email: "link@example.com" }) });
    expect(g.body.user.id).toBe(pw.body.user.id);
    expect(g.body.user.providers).toEqual(["google", "password"].sort());
  });

  it("stops account pre-hijacking: an attacker's password on a victim's email is removed when the victim signs in with Google", async () => {
    const attacker = await call("POST", "/api/auth/register", { email: "victim@gmail.com", password: "attacker-pass" });
    const victim = await call("POST", "/api/auth/google", { idToken: await googleToken({ sub: "g-victim", email: "victim@gmail.com" }) });
    expect(victim.body.user.hasPassword).toBe(false);
    expect((await call("POST", "/api/auth/login", { email: "victim@gmail.com", password: "attacker-pass" })).status).toBe(401);
    expect((await call("GET", "/api/auth/me", undefined, attacker.body.token)).status).toBe(401);
  });

  it("doesn't link on an unverified Google email", async () => {
    await call("POST", "/api/auth/register", { email: "unverified@example.com", password: "password123" });
    const g = await call("POST", "/api/auth/google", { idToken: await googleToken({ sub: "g-unv", email: "unverified@example.com", email_verified: false }) });
    expect(g.status).toBe(200);
    expect(g.body.user.email).toBeNull();
    expect((await call("POST", "/api/auth/login", { email: "unverified@example.com", password: "password123" })).status).toBe(200);
  });

  it("publishes which providers are available", async () => {
    const c = await call("GET", "/api/auth/config");
    expect(c.body).toMatchObject({ google: true, apple: true, googleWebClientId: "web-client.apps.googleusercontent.com" });
    // No redirect URL configured, so Apple on the website/Android isn't offered.
    expect(c.body.appleWeb).toBe(false);
  });

  it("offers Sign in with Apple to the iPhone app with just the bundle ID (no web Services ID)", async () => {
    const iosOnly = createApp(openDb(":memory:"), { googleClientIds: [], appleClientIds: ["com.caloriesdetector.app"], publicConfig: {} }).listen(0);
    const res = await fetch(`http://127.0.0.1:${(iosOnly.address() as AddressInfo).port}/api/auth/config`);
    expect(await res.json()).toMatchObject({ google: false, apple: true, appleWeb: false });
    iosOnly.close();
  });
});

describe("sync", () => {
  it("stores data, detects conflicting writes, and deletes everything with the account", async () => {
    const { body } = await call("POST", "/api/auth/register", { email: "sync@example.com", password: "password123" });
    const token = body.token;
    expect((await call("GET", "/api/data", undefined, token)).body).toMatchObject({ version: 0, data: null });

    const first = await call("PUT", "/api/data", { baseVersion: 0, data: { log: [1] } }, token);
    expect(first.body).toMatchObject({ version: 1, data: { log: [1] } });
    const second = await call("PUT", "/api/data", { baseVersion: 1, data: { log: [1, 2] } }, token);
    expect(second.body.version).toBe(2);

    // A second phone that last saw version 1 must not overwrite version 2.
    const stale = await call("PUT", "/api/data", { baseVersion: 1, data: { log: [9] } }, token);
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ version: 2, data: { log: [1, 2] } });

    expect((await call("GET", "/api/data")).status).toBe(401);

    expect((await call("DELETE", "/api/auth/me", undefined, token)).status).toBe(200);
    expect((await call("GET", "/api/data", undefined, token)).status).toBe(401);
    expect((await call("POST", "/api/auth/login", { email: "sync@example.com", password: "password123" })).status).toBe(401);
    expect(db.raw.prepare("SELECT COUNT(*) AS n FROM user_data").get()).toMatchObject({ n: 0 });
  });

  it("keeps users' data separate", async () => {
    const a = (await call("POST", "/api/auth/register", { email: "a@example.com", password: "password123" })).body.token;
    const b = (await call("POST", "/api/auth/register", { email: "b@example.com", password: "password123" })).body.token;
    await call("PUT", "/api/data", { baseVersion: 0, data: { secret: "a's diary" } }, a);
    expect((await call("GET", "/api/data", undefined, b)).body.data).toBeNull();
  });
});
