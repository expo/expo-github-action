import type { FingerprintSource, Fingerprint as FingerprintType } from '@expo/fingerprint';

import { Camelize, Database, openDatabaseAsync } from '../sqlite';
import { DbMigrationCoordinator } from './DbMigration';
import { GitHubArtifactsDbManager } from './GitHubArtifactsDbManager';
import { type IDbManager } from './IDbManager';

export type FingerprintDbEntity = Camelize<RawFingerprintDbEntity> & {
  fingerprint: FingerprintType;
};

export type FingerprintDbEntityWithArtifact = FingerprintDbEntity & {
  githubArtifact?: {
    id: number;
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
  };
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
      githubArtifact?: {
        artifactId: string;
        artifactUrl: string;
        artifactDigest: string;
        workflowRunId: string;
      };
      platform?: string;
    }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const easBuildId = params.easBuildId ?? '';
    const platform = params.platform ?? null;
    const fingerprintString = JSON.stringify(params.fingerprint);

    let githubArtifactId: number | null = null;
    if (params.githubArtifact) {
      const artifactsManager = new GitHubArtifactsDbManager(this.db);
      githubArtifactId = await artifactsManager.upsertArtifactAsync(params.githubArtifact);
    }

    await this.db.runAsync(
      `INSERT INTO ${FingerprintDbManager.TABLE_NAME} (git_commit_hash, eas_build_id, fingerprint_hash, fingerprint, github_artifact_id, platform) VALUES (?, ?, ?, json(?), ?, ?) \
       ON CONFLICT(git_commit_hash) DO UPDATE SET eas_build_id = ?, fingerprint_hash = ?, fingerprint = json(?), github_artifact_id = ?, platform = ?`,
      gitCommitHash,
      easBuildId,
      params.fingerprint.hash,
      fingerprintString,
      githubArtifactId,
      platform,
      easBuildId,
      params.fingerprint.hash,
      fingerprintString,
      githubArtifactId,
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

  public async getFirstEntityWithGitHubArtifactFromFingerprintHashAsync(
    fingerprintHash: string
  ): Promise<FingerprintDbEntityWithArtifact | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initAsync() first.');
    }
    const row = await this.db.getAsync<
      RawFingerprintDbEntity & {
        artifact_id: string;
        artifact_url: string;
        artifact_digest: string;
        artifact_pk_id: number;
        workflow_run_id: string;
      }
    >(
      `SELECT f.*, a.id as artifact_pk_id, a.artifact_id, a.artifact_url, a.artifact_digest, a.workflow_run_id
       FROM ${FingerprintDbManager.TABLE_NAME} f
       JOIN github_artifacts a ON f.github_artifact_id = a.id
       WHERE f.fingerprint_hash = ? AND f.github_artifact_id IS NOT NULL
       LIMIT 1`,
      fingerprintHash
    );

    if (!row) {
      return null;
    }

    const entity = FingerprintDbManager.serialize(row);
    return {
      ...entity,
      githubArtifact: {
        id: row.artifact_pk_id,
        artifactId: row.artifact_id,
        artifactUrl: row.artifact_url,
        artifactDigest: row.artifact_digest,
        workflowRunId: row.workflow_run_id,
      },
    };
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

  private static readonly TABLE_NAME = 'fingerprint';

  private static readonly SCHEMA = [
    'id INTEGER PRIMARY KEY AUTOINCREMENT',
    'eas_build_id TEXT',
    'git_commit_hash TEXT NOT NULL',
    'fingerprint_hash TEXT NOT NULL',
    'fingerprint TEXT NOT NULL',
    'github_artifact_id INTEGER REFERENCES github_artifacts(id)',
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
      githubArtifactId: rawEntity.github_artifact_id,
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
  github_artifact_id: number | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}
