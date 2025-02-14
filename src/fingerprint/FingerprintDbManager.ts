import type { FingerprintSource, Fingerprint as FingerprintType } from '@expo/fingerprint';

import { Database, openDatabaseAsync } from '../sqlite';

export type FingerprintDbEntity = Camelize<RawFingerprintDbEntity> & {
  fingerprint: FingerprintType;
};

export class FingerprintDbManager {
  constructor(private readonly dbPath: string) {}

  public async initAsync(): Promise<Database> {
    const db = await openDatabaseAsync(this.dbPath);
    await db.runAsync(
      `CREATE TABLE IF NOT EXISTS ${
        FingerprintDbManager.TABLE_NAME
      } (${FingerprintDbManager.SCHEMA.join(', ')})`
    );
    for (const index of FingerprintDbManager.INDEXES) {
      await db.runAsync(index);
    }
    for (const extraStatement of FingerprintDbManager.EXTRA_CREATE_DB_STATEMENTS) {
      await db.runAsync(extraStatement);
    }
    await db.runAsync(`PRAGMA fingerprint_schema_version = ${FingerprintDbManager.SCHEMA_VERSION}`);
    this.db = db;
    return db;
  }

  public async upsertFingerprintByGitCommitHashAsync(
    gitCommitHash: string,
    params: {
      easBuildId?: string;
      fingerprint: FingerprintType;
    }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const easBuildId = params.easBuildId ?? '';
    const fingerprintString = JSON.stringify(params.fingerprint);
    await this.db.runAsync(
      `INSERT INTO ${FingerprintDbManager.TABLE_NAME} (git_commit_hash, eas_build_id, fingerprint_hash, fingerprint) VALUES (?, ?, ?, json(?)) \
       ON CONFLICT(git_commit_hash) DO UPDATE SET eas_build_id = ?, fingerprint_hash = ?, fingerprint = json(?)`,
      gitCommitHash,
      easBuildId,
      params.fingerprint.hash,
      fingerprintString,
      easBuildId,
      params.fingerprint.hash,
      fingerprintString
    );
  }

  public async queryEasBuildIdsFromFingerprintAsync(fingerprintHash: string): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const rows = await this.db.allAsync<{ eas_build_id: string }>(
      `SELECT eas_build_id FROM ${FingerprintDbManager.TABLE_NAME} WHERE fingerprint_hash = ?`,
      fingerprintHash
    );
    return rows.map(row => row['eas_build_id']);
  }

  /**
   * Get the latest entity from the fingerprint hash where the eas_build_id is not null.
   */
  public async getLatestEasEntityFromFingerprintAsync(
    fingerprintHash: string
  ): Promise<FingerprintDbEntity | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const row = await this.db.getAsync<RawFingerprintDbEntity>(
      `SELECT * FROM ${FingerprintDbManager.TABLE_NAME}
      WHERE eas_build_id IS NOT NULL AND eas_build_id != "" AND fingerprint_hash = ?
      ORDER BY updated_at DESC LIMIT 1`,
      fingerprintHash
    );
    return row ? FingerprintDbManager.serialize(row) : null;
  }

  public async getEntityFromGitCommitHashAsync(
    gitCommitHash: string
  ): Promise<FingerprintDbEntity | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const row = await this.db.getAsync<RawFingerprintDbEntity>(
      `SELECT * FROM ${FingerprintDbManager.TABLE_NAME} WHERE git_commit_hash = ?`,
      gitCommitHash
    );
    return row ? FingerprintDbManager.serialize(row) : null;
  }

  public async getFirstEntityFromFingerprintHashAsync(
    fingerprintHash: string
  ): Promise<FingerprintDbEntity | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const row = await this.db.getAsync<RawFingerprintDbEntity>(
      `SELECT * FROM ${FingerprintDbManager.TABLE_NAME} WHERE fingerprint_hash = ?`,
      fingerprintHash
    );
    return row ? FingerprintDbManager.serialize(row) : null;
  }

  public async queryEntitiesFromFingerprintHashAsync(
    fingerprintHash: string
  ): Promise<FingerprintDbEntity[]> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const rows = await this.db.allAsync<RawFingerprintDbEntity>(
      `SELECT * FROM ${FingerprintDbManager.TABLE_NAME} WHERE fingerprint_hash = ?`,
      fingerprintHash
    );
    return rows.map(row => FingerprintDbManager.serialize(row));
  }

  public async getFingerprintSourcesAsync(
    fingerprintHash: string
  ): Promise<FingerprintSource[] | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const row = await this.db.getAsync<{ sources: string }>(
      `SELECT json_extract(fingerprint, '$.sources') as sources FROM ${FingerprintDbManager.TABLE_NAME} WHERE fingerprint_hash = ?`,
      fingerprintHash
    );
    const result = row?.['sources'];
    if (!result) {
      return null;
    }
    return JSON.parse(result);
  }

  public async closeAsync(): Promise<void> {
    this.db?.closeAsync();
  }

  //#region private

  private static readonly SCHEMA_VERSION = 0;

  private static readonly TABLE_NAME = 'fingerprint';

  private static readonly SCHEMA = [
    'id INTEGER PRIMARY KEY AUTOINCREMENT',
    'eas_build_id TEXT',
    'git_commit_hash TEXT NOT NULL',
    'fingerprint_hash TEXT NOT NULL',
    'fingerprint TEXT NOT NULL',
    "created_at TEXT NOT NULL DEFAULT (DATETIME('now', 'utc'))",
    "updated_at TEXT NOT NULL DEFAULT (DATETIME('now', 'utc'))",
  ];

  private static readonly INDEXES = [
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_git_commit_hash ON ${this.TABLE_NAME} (git_commit_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_fingerprint_hash ON ${this.TABLE_NAME} (fingerprint_hash)`,
  ];

  private static readonly EXTRA_CREATE_DB_STATEMENTS = [
    `CREATE TRIGGER IF NOT EXISTS update_fingerprint_updated_at AFTER UPDATE ON ${this.TABLE_NAME}
BEGIN
  UPDATE ${this.TABLE_NAME} SET updated_at = DATETIME('now', 'utc') WHERE id = NEW.id;
END`,
  ];
  private db: Database | null = null;

  private static serialize(rawEntity: RawFingerprintDbEntity): FingerprintDbEntity {
    return {
      id: rawEntity.id,
      easBuildId: rawEntity.eas_build_id,
      gitCommitHash: rawEntity.git_commit_hash,
      fingerprintHash: rawEntity.fingerprint_hash,
      fingerprint: JSON.parse(rawEntity.fingerprint),
      createdAt: rawEntity.created_at,
      updatedAt: rawEntity.updated_at,
    };
  }

  //#endregion
}

interface RawFingerprintDbEntity {
  id: number;
  eas_build_id: string | null;
  git_commit_hash: string;
  fingerprint_hash: string;
  fingerprint: string;
  created_at: string;
  updated_at: string;
}

//#region TypeScript utilities
// https://stackoverflow.com/a/63715429
type CamelizeString<T extends PropertyKey, C extends string = ''> = T extends string
  ? string extends T
    ? string
    : T extends `${infer F}_${infer R}`
      ? CamelizeString<Capitalize<R>, `${C}${F}`>
      : `${C}${T}`
  : T;

type Camelize<T> = { [K in keyof T as CamelizeString<K>]: T[K] };
//#endregion
