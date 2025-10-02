import type { FingerprintSource, Fingerprint as FingerprintType } from '@expo/fingerprint';

import { Camelize, Database, openDatabaseAsync } from '../sqlite';
import { DbMigrationCoordinator } from './DbMigration';
import { GitHubArtifactsDbManager } from './GitHubArtifactsDbManager';
import { type IDbManager } from './IDbManager';

export type FingerprintDbEntity = Omit<Camelize<RawFingerprintDbEntity>, 'fingerprint'> & {
  fingerprint: FingerprintType;
};

export class FingerprintDbManager implements IDbManager {
  constructor(private readonly dbPath: string) {}

  public async runInitialTableCreation(db: Database): Promise<void> {
    await db.runAsync(
      `CREATE TABLE ${FingerprintDbManager.TABLE_NAME} (${FingerprintDbManager.SCHEMA.join(', ')})`
    );

    for (const index of FingerprintDbManager.INDEXES) {
      await db.runAsync(index);
    }
    for (const extraStatement of FingerprintDbManager.EXTRA_CREATE_DB_STATEMENTS) {
      await db.runAsync(extraStatement);
    }
  }

  public async initAsync(): Promise<Database> {
    const db = await openDatabaseAsync(this.dbPath);

    const coordinator = new DbMigrationCoordinator();
    coordinator.registerManager('fingerprint', this);
    coordinator.registerManager('github-artifacts', new GitHubArtifactsDbManager(db));

    await coordinator.initializeDatabase(db);
    this.db = db;
    return db;
  }

  public async upsertFingerprintByGitCommitHashAsync(
    gitCommitHash: string,
    params: {
      easBuildId?: string;
      fingerprint: FingerprintType;
      platform?: string;
    }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const easBuildId = params.easBuildId ?? '';
    const platform = params.platform ?? null;
    const fingerprintString = JSON.stringify(params.fingerprint);

    await this.db.runAsync(
      `INSERT INTO ${FingerprintDbManager.TABLE_NAME} (git_commit_hash, eas_build_id, fingerprint_hash, fingerprint, platform) VALUES (?, ?, ?, json(?), ?) \
       ON CONFLICT(git_commit_hash) DO UPDATE SET eas_build_id = ?, fingerprint_hash = ?, fingerprint = json(?), platform = ?`,
      gitCommitHash,
      easBuildId,
      params.fingerprint.hash,
      fingerprintString,
      platform,
      easBuildId,
      params.fingerprint.hash,
      fingerprintString,
      platform
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
    return rows.map((row) => row['eas_build_id']);
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
    return rows.map((row) => FingerprintDbManager.serialize(row));
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

  public async getFirstGitHubArtifactAsync(
    fingerprintHash: string,
    platform: string
  ): Promise<{
    id: number;
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
    platform: string;
  } | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }

    const row = await this.db.getAsync<{
      id: number;
      artifact_id: string;
      artifact_url: string;
      artifact_digest: string;
      workflow_run_id: string;
      platform: string;
    }>(
      `SELECT ga.id, ga.artifact_id, ga.artifact_url, ga.artifact_digest, ga.workflow_run_id, ga.platform
       FROM ${FingerprintDbManager.TABLE_NAME} f
       JOIN github_artifacts ga ON f.id = ga.fingerprint_id
       WHERE f.fingerprint_hash = ? AND (ga.platform = ? AND (f.platform = ? OR f.platform IS NULL))
       ORDER BY f.id ASC, ga.id ASC
       LIMIT 1`,
      fingerprintHash,
      platform,
      platform
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      artifactId: row.artifact_id,
      artifactUrl: row.artifact_url,
      artifactDigest: row.artifact_digest,
      workflowRunId: row.workflow_run_id,
      platform: row.platform,
    };
  }

  public getArtifactsManager(): GitHubArtifactsDbManager {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    return new GitHubArtifactsDbManager(this.db);
  }

  public async closeAsync(): Promise<void> {
    this.db?.closeAsync();
  }

  //#region private

  private static readonly TABLE_NAME = 'fingerprint';

  private static readonly SCHEMA = [
    'id INTEGER PRIMARY KEY AUTOINCREMENT',
    'eas_build_id TEXT',
    'git_commit_hash TEXT NOT NULL',
    'fingerprint_hash TEXT NOT NULL',
    'fingerprint TEXT NOT NULL',
    'platform TEXT',
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
      platform: rawEntity.platform,
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
  platform: string | null;
  created_at: string;
  updated_at: string;
}
