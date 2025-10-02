import { info } from '@actions/core';

import { GitHubArtifactsDbManager } from './GitHubArtifactsDbManager';
import { Database } from '../sqlite';
import { type IDbManager } from './IDbManager';

export class DbMigrationCoordinator {
  public static readonly CURRENT_SCHEMA_VERSION = 1;
  private readonly managers = new Map<string, IDbManager>();

  public registerManager(managerId: string, manager: IDbManager): void {
    if (this.managers.has(managerId)) {
      throw new Error(`DbManager with id '${managerId}' is already registered`);
    }
    this.managers.set(managerId, manager);
  }

  public async initializeDatabase(db: Database): Promise<void> {
    if (this.managers.size === 0) {
      throw new Error('No DbManagers registered. Call registerManager() first.');
    }

    const currentDbVersion = await this.getCurrentDatabaseVersion(db);
    const targetDbVersion = DbMigrationCoordinator.CURRENT_SCHEMA_VERSION;

    if (currentDbVersion === 0 && !(await this.fingerprintTableExistsAsync(db))) {
      await this.runInitialDatabaseCreation(db);
    } else if (currentDbVersion < targetDbVersion) {
      await this.runDatabaseMigrations(db, currentDbVersion, targetDbVersion);
    } else if (currentDbVersion > targetDbVersion) {
      throw new Error(
        `Database version ${currentDbVersion} is higher than expected ${targetDbVersion}. ` +
          'This might indicate a newer version of the software was used previously.'
      );
    }

    await this.updateDatabaseVersion(db, targetDbVersion);
  }

  public async getCurrentDatabaseVersion(db: Database): Promise<number> {
    try {
      const result = await db.getAsync<{ user_version: number }>('PRAGMA user_version');
      return result?.user_version ?? 0;
    } catch {
      return 0;
    }
  }

  public getTargetDatabaseVersion(): number {
    return DbMigrationCoordinator.CURRENT_SCHEMA_VERSION;
  }

  private async runInitialDatabaseCreation(db: Database): Promise<void> {
    for (const [, manager] of this.managers.entries()) {
      await manager.runInitialTableCreation(db);
    }
  }

  private async runDatabaseMigrations(
    db: Database,
    currentDbVersion: number,
    targetDbVersion: number
  ): Promise<void> {
    info(
      `Planning to run database migrations from version ${currentDbVersion} to ${targetDbVersion}`
    );

    for (let version = currentDbVersion; version < targetDbVersion; version++) {
      const nextVersion = version + 1;
      await this.runMigrationStep(db, version, nextVersion);
    }
  }

  private async runMigrationStep(
    db: Database,
    fromVersion: number,
    toVersion: number
  ): Promise<void> {
    switch (toVersion) {
      case 1: {
        info(
          'Migration 0 -> 1: Adding github_artifacts table with fingerprint_id and platform column'
        );

        await GitHubArtifactsDbManager.createTableIfNotExistsAsync(db);
        await db.runAsync('ALTER TABLE fingerprint ADD COLUMN platform TEXT');

        break;
      }

      default:
        throw new Error(`Unknown migration step from version ${fromVersion} to ${toVersion}`);
    }
  }

  private async updateDatabaseVersion(db: Database, version: number): Promise<void> {
    await db.runAsync(`PRAGMA user_version = ${version}`);
  }

  /**
   * We did handle `user_version` well in the past.
   * If it's zero, it means either no database file exists or the database is the first version.
   * In this case, we check if any of the known tables exist to determine if it's a fresh database.
   */
  private async fingerprintTableExistsAsync(db: Database): Promise<boolean> {
    const result = await db.getAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='fingerprint'`
    );
    return (result?.count ?? 0) > 0;
  }
}
