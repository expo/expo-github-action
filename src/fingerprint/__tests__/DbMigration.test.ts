import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { DbMigrationCoordinator } from '../../fingerprint/DbMigration';
import { type IDbManager } from '../../fingerprint/IDbManager';
import { Database, openDatabaseAsync } from '../../sqlite';

class MockDbManager implements IDbManager {
  constructor(
    private readonly tableName: string,
    private readonly initCalled: () => void = () => {}
  ) {}

  async runInitialTableCreation(db: Database): Promise<void> {
    await db.runAsync(`CREATE TABLE ${this.tableName} (id INTEGER PRIMARY KEY)`);
    this.initCalled();
  }
}

describe('DbMigrationCoordinator', () => {
  let db: Database;
  let coordinator: DbMigrationCoordinator;

  beforeEach(async () => {
    db = await openDatabaseAsync(':memory:');
    coordinator = new DbMigrationCoordinator();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  describe('registerManager', () => {
    it('should register a manager successfully', () => {
      const manager = new MockDbManager('test_table');
      expect(() => coordinator.registerManager('test', manager)).not.toThrow();
    });

    it('should throw error when registering duplicate manager id', () => {
      const manager1 = new MockDbManager('test_table1');
      const manager2 = new MockDbManager('test_table2');

      coordinator.registerManager('test', manager1);
      expect(() => coordinator.registerManager('test', manager2)).toThrow(
        "DbManager with id 'test' is already registered"
      );
    });
  });

  describe('getTargetDatabaseVersion', () => {
    it('should return the current schema version', () => {
      expect(coordinator.getTargetDatabaseVersion()).toBe(
        DbMigrationCoordinator.CURRENT_SCHEMA_VERSION
      );
    });
  });

  describe('getCurrentDatabaseVersion', () => {
    it('should return 0 for new database', async () => {
      const version = await coordinator.getCurrentDatabaseVersion(db);
      expect(version).toBe(0);
    });

    it('should return stored version from PRAGMA user_version', async () => {
      await db.runAsync('PRAGMA user_version = 1');
      const version = await coordinator.getCurrentDatabaseVersion(db);
      expect(version).toBe(1);
    });
  });

  describe('initializeDatabase', () => {
    it('should throw error when no managers registered', async () => {
      await expect(coordinator.initializeDatabase(db)).rejects.toThrow(
        'No DbManagers registered. Call registerManager() first.'
      );
    });

    it('should run initial table creation for new database', async () => {
      const initCalls: string[] = [];
      const manager1 = new MockDbManager('table1', () => initCalls.push('manager1'));
      const manager2 = new MockDbManager('table2', () => initCalls.push('manager2'));

      coordinator.registerManager('manager1', manager1);
      coordinator.registerManager('manager2', manager2);

      await coordinator.initializeDatabase(db);

      expect(initCalls).toEqual(['manager1', 'manager2']);

      const version = await coordinator.getCurrentDatabaseVersion(db);
      expect(version).toBe(DbMigrationCoordinator.CURRENT_SCHEMA_VERSION);
    });

    it('should not run migrations for fully migrated database', async () => {
      const initCalls: string[] = [];
      const manager1 = new MockDbManager('table1', () => initCalls.push('manager1'));

      coordinator.registerManager('manager1', manager1);

      // Set database to target version
      await db.runAsync(`PRAGMA user_version = ${DbMigrationCoordinator.CURRENT_SCHEMA_VERSION}`);

      await coordinator.initializeDatabase(db);

      expect(initCalls).toEqual([]);

      const version = await coordinator.getCurrentDatabaseVersion(db);
      expect(version).toBe(DbMigrationCoordinator.CURRENT_SCHEMA_VERSION);
    });

    it('should throw error for database version higher than target', async () => {
      const manager = new MockDbManager('table1');
      coordinator.registerManager('manager1', manager);

      // Set database version higher than target
      await db.runAsync(`PRAGMA user_version = 99999`);

      await expect(coordinator.initializeDatabase(db)).rejects.toThrow(
        `Database version 99999 is higher than expected ${DbMigrationCoordinator.CURRENT_SCHEMA_VERSION}. This might indicate a newer version of the software was used previously.`
      );
    });
  });

  describe('migration steps', () => {
    it('should handle migration from version 0 to 1 with one-to-many relationship', async () => {
      await db.runAsync('PRAGMA user_version = 0');
      await db.runAsync(`
        CREATE TABLE fingerprint (
          id INTEGER PRIMARY KEY,
          git_commit_hash TEXT NOT NULL,
          fingerprint_hash TEXT NOT NULL,
          fingerprint TEXT NOT NULL
        )
      `);

      const manager1 = new MockDbManager('fingerprint');
      coordinator.registerManager('fingerprint', manager1);

      await coordinator.initializeDatabase(db);

      const fingerprintTableInfo = await db.allAsync<{ name: string }>(
        'PRAGMA table_info(fingerprint)'
      );
      const fingerprintColumnNames = fingerprintTableInfo.map((col) => col.name);
      expect(fingerprintColumnNames).toContain('platform');
      expect(fingerprintColumnNames).not.toContain('github_artifact_id');

      const githubArtifactsTable = await db.allAsync<{ name: string }>(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='github_artifacts'
      `);
      expect(githubArtifactsTable).toHaveLength(1);

      const artifactsTableInfo = await db.allAsync<{ name: string }>(
        'PRAGMA table_info(github_artifacts)'
      );
      const artifactsColumnNames = artifactsTableInfo.map((col) => col.name);
      expect(artifactsColumnNames).toContain('fingerprint_id');
      expect(artifactsColumnNames).toContain('platform');
      expect(artifactsColumnNames).toContain('artifact_id');

      const junctionTable = await db.allAsync<{ name: string }>(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='fingerprint_github_artifacts'
      `);
      expect(junctionTable).toHaveLength(0);

      const version = await coordinator.getCurrentDatabaseVersion(db);
      expect(version).toBe(DbMigrationCoordinator.CURRENT_SCHEMA_VERSION);
    });

    it('should detect existing fingerprint table and run migration', async () => {
      await db.runAsync('PRAGMA user_version = 0');
      await db.runAsync(`
        CREATE TABLE fingerprint (
          id INTEGER PRIMARY KEY,
          git_commit_hash TEXT NOT NULL,
          fingerprint_hash TEXT NOT NULL,
          fingerprint TEXT NOT NULL
        )
      `);

      const manager1 = new MockDbManager('fingerprint');
      coordinator.registerManager('fingerprint', manager1);

      await coordinator.initializeDatabase(db);

      const version = await coordinator.getCurrentDatabaseVersion(db);
      expect(version).toBe(DbMigrationCoordinator.CURRENT_SCHEMA_VERSION);

      const tables = await db.allAsync<{ name: string }>(`
        SELECT name FROM sqlite_master WHERE type='table'
        AND name = 'github_artifacts'
      `);
      expect(tables).toHaveLength(1);
    });
  });
});
