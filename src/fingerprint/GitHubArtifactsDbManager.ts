import { Camelize, Database } from '../sqlite';
import { type IDbManager } from './IDbManager';

export type GitHubArtifactDbEntity = Camelize<RawGitHubArtifactDbEntity>;

export class GitHubArtifactsDbManager implements IDbManager {
  constructor(private readonly db: Database) {}

  public async runInitialTableCreation(db: Database): Promise<void> {
    await db.runAsync(
      `CREATE TABLE ${GitHubArtifactsDbManager.TABLE_NAME} (${GitHubArtifactsDbManager.SCHEMA.join(', ')})`
    );
  }

  public async insertArtifactAsync(params: {
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
  }): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO ${GitHubArtifactsDbManager.TABLE_NAME} (artifact_id, artifact_url, artifact_digest, workflow_run_id) VALUES (?, ?, ?, ?)`,
      params.artifactId,
      params.artifactUrl,
      params.artifactDigest,
      params.workflowRunId
    );
    return result.lastID;
  }

  public async upsertArtifactAsync(params: {
    artifactId: string;
    artifactUrl: string;
    artifactDigest: string;
    workflowRunId: string;
  }): Promise<number> {
    const existing = await this.getArtifactByArtifactIdAsync(params.artifactId);
    if (existing) {
      await this.db.runAsync(
        `UPDATE ${GitHubArtifactsDbManager.TABLE_NAME} SET artifact_url = ?, artifact_digest = ?, workflow_run_id = ? WHERE artifact_id = ?`,
        params.artifactUrl,
        params.artifactDigest,
        params.workflowRunId,
        params.artifactId
      );
      return existing.id;
    }
    return this.insertArtifactAsync(params);
  }

  public async getArtifactByIdAsync(id: number): Promise<GitHubArtifactDbEntity | null> {
    const row = await this.db.getAsync<RawGitHubArtifactDbEntity>(
      `SELECT * FROM ${GitHubArtifactsDbManager.TABLE_NAME} WHERE id = ?`,
      id
    );
    return row ? GitHubArtifactsDbManager.serialize(row) : null;
  }

  public async getArtifactByArtifactIdAsync(
    artifactId: string
  ): Promise<GitHubArtifactDbEntity | null> {
    const row = await this.db.getAsync<RawGitHubArtifactDbEntity>(
      `SELECT * FROM ${GitHubArtifactsDbManager.TABLE_NAME} WHERE artifact_id = ?`,
      artifactId
    );
    return row ? GitHubArtifactsDbManager.serialize(row) : null;
  }

  public async deleteArtifactByIdAsync(id: number): Promise<void> {
    await this.db.runAsync(`DELETE FROM ${GitHubArtifactsDbManager.TABLE_NAME} WHERE id = ?`, id);
  }

  public static async createTableIfNotExistsAsync(db: Database): Promise<void> {
    await db.runAsync(
      `CREATE TABLE IF NOT EXISTS ${GitHubArtifactsDbManager.TABLE_NAME} (${GitHubArtifactsDbManager.SCHEMA.join(', ')})`
    );
  }

  private static readonly TABLE_NAME = 'github_artifacts';

  private static readonly SCHEMA = [
    'id INTEGER PRIMARY KEY AUTOINCREMENT',
    'artifact_id TEXT NOT NULL',
    'artifact_url TEXT NOT NULL',
    'artifact_digest TEXT NOT NULL',
    'workflow_run_id TEXT NOT NULL',
  ];

  private static serialize(rawEntity: RawGitHubArtifactDbEntity): GitHubArtifactDbEntity {
    return {
      id: rawEntity.id,
      artifactId: rawEntity.artifact_id,
      artifactUrl: rawEntity.artifact_url,
      artifactDigest: rawEntity.artifact_digest,
      workflowRunId: rawEntity.workflow_run_id,
    };
  }
}

interface RawGitHubArtifactDbEntity {
  id: number;
  artifact_id: string;
  artifact_url: string;
  artifact_digest: string;
  workflow_run_id: string;
}
