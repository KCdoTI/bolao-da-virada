import { neon } from "@neondatabase/serverless";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { PoolState } from "../src/types";

export interface StoredPool {
  id: string;
  slug: string;
  admin: string;
  revision: number;
  payload: PoolState;
  history: { at: string; action: string; digest: string }[];
}
export interface PoolStore {
  close?(): void;
  get(key: string, admin?: boolean): Promise<StoredPool | undefined>;
  create(row: StoredPool): Promise<void>;
  update(row: StoredPool, previousRevision: number): Promise<boolean>;
  putReceipt(id: string, pool: string, data: string): Promise<void>;
  getReceipt(id: string, pool: string): Promise<string | undefined>;
}
export async function sqliteStore(filename: string): Promise<PoolStore> {
  const { DatabaseSync } = await import("node:sqlite");
  mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS pools (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, admin TEXT UNIQUE NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, history TEXT NOT NULL)",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, pool TEXT NOT NULL, data TEXT NOT NULL)",
  );
  return {
    close() {
      db.close();
    },
    async putReceipt(id, pool, data) {
      db.prepare("INSERT OR IGNORE INTO receipts VALUES (?,?,?)").run(
        id,
        pool,
        data,
      );
    },
    async getReceipt(id, pool) {
      return (
        db
          .prepare("SELECT data FROM receipts WHERE id=? AND pool=?")
          .get(id, pool) as any
      )?.data;
    },
    async get(key, admin = false) {
      const row = db
        .prepare(`SELECT * FROM pools WHERE ${admin ? "admin" : "slug"} = ?`)
        .get(key) as any;
      return row
        ? {
            ...row,
            payload: JSON.parse(row.payload),
            history: JSON.parse(row.history),
          }
        : undefined;
    },
    async create(r) {
      db.prepare("INSERT INTO pools VALUES (?,?,?,?,?,?)").run(
        r.id,
        r.slug,
        r.admin,
        r.revision,
        JSON.stringify(r.payload),
        JSON.stringify(r.history),
      );
    },
    async update(r, previous) {
      return (
        db
          .prepare(
            "UPDATE pools SET slug=?,revision=?,payload=?,history=? WHERE id=? AND revision=?",
          )
          .run(
            r.slug,
            r.revision,
            JSON.stringify(r.payload),
            JSON.stringify(r.history),
            r.id,
            previous,
          ).changes === 1
      );
    },
  };
}
async function postgresStore(url: string): Promise<PoolStore> {
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS pools (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, admin TEXT UNIQUE NOT NULL, revision INTEGER NOT NULL, payload JSONB NOT NULL, history JSONB NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, pool TEXT NOT NULL REFERENCES pools(id), data TEXT NOT NULL)`;
  return {
    async putReceipt(id, pool, data) {
      await sql`INSERT INTO receipts VALUES (${id},${pool},${data}) ON CONFLICT (id) DO NOTHING`;
    },
    async getReceipt(id, pool) {
      const rows =
        await sql`SELECT data FROM receipts WHERE id=${id} AND pool=${pool}`;
      return rows[0]?.data;
    },
    async get(key, admin = false) {
      const rows = admin
        ? await sql`SELECT * FROM pools WHERE admin=${key}`
        : await sql`SELECT * FROM pools WHERE slug=${key}`;
      return rows[0] as StoredPool | undefined;
    },
    async create(r) {
      await sql`INSERT INTO pools VALUES (${r.id},${r.slug},${r.admin},${r.revision},${JSON.stringify(r.payload)}::jsonb,${JSON.stringify(r.history)}::jsonb)`;
    },
    async update(r, previous) {
      const rows =
        await sql`UPDATE pools SET slug=${r.slug}, revision=${r.revision}, payload=${JSON.stringify(r.payload)}::jsonb, history=${JSON.stringify(r.history)}::jsonb WHERE id=${r.id} AND revision=${previous} RETURNING id`;
      return rows.length === 1;
    },
  };
}
let singleton: Promise<PoolStore> | undefined;
export function getStore(): Promise<PoolStore> {
  if (!singleton) {
    const url = process.env.DATABASE_URL;
    if (!url && (process.env.VERCEL || process.env.NODE_ENV === "production"))
      throw new Error("Banco compartilhado não configurado.");
    singleton = (
      url
        ? postgresStore(url)
        : sqliteStore(process.env.BOLAO_SQLITE_PATH || ".data/boloes.sqlite")
    ).catch((e) => {
      singleton = undefined;
      throw e;
    });
  }
  return singleton;
}
