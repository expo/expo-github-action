import { beforeEach, describe, expect, it } from 'bun:test';

import { DbMigrationCoordinator } from '../../fingerprint/DbMigration';
import { GitHubArtifactsDbManager } from '../../fingerprint/GitHubArtifactsDbManager';
import { openDatabaseAsync } from '../../sqlite';

describe(GitHubArtifactsDbManager, () => {
  let artifactsManager: GitHubArtifactsDbManager;

  beforeEach(async () => {
    const db = await openDatabaseAsync(':memory:');
    artifactsManager = new GitHubArtifactsDbManager(db);

    // Initialize the table using the migration system
    const coordinator = new DbMigrationCoordinator();
    coordinator.registerManager('github-artifacts', artifactsManager);
    await coordinator.initializeDatabase(db);
  });

  it('insertArtifactAsync should insert new artifact', async () => {
    const id = await artifactsManager.insertArtifactAsync({
      fingerprintId: 1,
      platform: 'ios',
      artifactId: 'artifact-123',
      artifactUrl: 'https://github.com/example/artifact.zip',
      artifactDigest: 'sha256:abc123',
      workflowRunId: '123',
    });

    expect(id).toBeGreaterThan(0);

    const result = await artifactsManager.getArtifactByIdAsync(id);
    expect(result?.artifactId).toBe('artifact-123');
    expect(result?.artifactUrl).toBe('https://github.com/example/artifact.zip');
    expect(result?.artifactDigest).toBe('sha256:abc123');
  });

  it('getArtifactByArtifactIdAsync should retrieve artifact by business key', async () => {
    await artifactsManager.insertArtifactAsync({
      fingerprintId: 1,
      platform: 'android',
      artifactId: 'artifact-456',
      artifactUrl: 'https://github.com/example/artifact2.zip',
      artifactDigest: 'sha256:def456',
      workflowRunId: '456',
    });

    const result = await artifactsManager.getArtifactByArtifactIdAsync('artifact-456');
    expect(result?.artifactId).toBe('artifact-456');
    expect(result?.artifactUrl).toBe('https://github.com/example/artifact2.zip');
    expect(result?.artifactDigest).toBe('sha256:def456');

    const notFound = await artifactsManager.getArtifactByArtifactIdAsync('nonexistent');
    expect(notFound).toBe(null);
  });

  it('deleteArtifactByIdAsync should delete artifact', async () => {
    const id = await artifactsManager.insertArtifactAsync({
      fingerprintId: 1,
      platform: 'ios',
      artifactId: 'artifact-delete',
      artifactUrl: 'https://github.com/example/delete.zip',
      artifactDigest: 'sha256:delete',
      workflowRunId: '456',
    });

    let result = await artifactsManager.getArtifactByIdAsync(id);
    expect(result).toBeTruthy();

    await artifactsManager.deleteArtifactByIdAsync(id);

    result = await artifactsManager.getArtifactByIdAsync(id);
    expect(result).toBe(null);
  });

  it('getArtifactsByFingerprintIdAsync should return artifacts for fingerprint', async () => {
    const fingerprintId = 42;

    await artifactsManager.insertArtifactAsync({
      fingerprintId,
      platform: 'ios',
      artifactId: 'artifact-ios',
      artifactUrl: 'https://github.com/example/ios.zip',
      artifactDigest: 'sha256:ios123',
      workflowRunId: '123',
    });

    await artifactsManager.insertArtifactAsync({
      fingerprintId,
      platform: 'android',
      artifactId: 'artifact-android',
      artifactUrl: 'https://github.com/example/android.zip',
      artifactDigest: 'sha256:android456',
      workflowRunId: '124',
    });

    await artifactsManager.insertArtifactAsync({
      fingerprintId: 99,
      platform: 'web',
      artifactId: 'artifact-web',
      artifactUrl: 'https://github.com/example/web.zip',
      artifactDigest: 'sha256:web789',
      workflowRunId: '125',
    });

    const artifacts = await artifactsManager.getArtifactsByFingerprintIdAsync(fingerprintId);
    expect(artifacts).toHaveLength(2);

    const iosArtifact = artifacts.find((a) => a.platform === 'ios');
    expect(iosArtifact?.artifactId).toBe('artifact-ios');
    expect(iosArtifact?.fingerprintId).toBe(fingerprintId);

    const androidArtifact = artifacts.find((a) => a.platform === 'android');
    expect(androidArtifact?.artifactId).toBe('artifact-android');
    expect(androidArtifact?.fingerprintId).toBe(fingerprintId);

    const otherArtifacts = await artifactsManager.getArtifactsByFingerprintIdAsync(99);
    expect(otherArtifacts).toHaveLength(1);
    expect(otherArtifacts[0]?.platform).toBe('web');
  });

  it('deleteArtifactsByFingerprintIdAsync should delete all artifacts for fingerprint', async () => {
    const fingerprintId1 = 10;
    const fingerprintId2 = 20;

    await artifactsManager.insertArtifactAsync({
      fingerprintId: fingerprintId1,
      platform: 'ios',
      artifactId: 'artifact-1',
      artifactUrl: 'https://github.com/example/1.zip',
      artifactDigest: 'sha256:1',
      workflowRunId: '1',
    });

    await artifactsManager.insertArtifactAsync({
      fingerprintId: fingerprintId1,
      platform: 'android',
      artifactId: 'artifact-2',
      artifactUrl: 'https://github.com/example/2.zip',
      artifactDigest: 'sha256:2',
      workflowRunId: '2',
    });

    await artifactsManager.insertArtifactAsync({
      fingerprintId: fingerprintId2,
      platform: 'web',
      artifactId: 'artifact-3',
      artifactUrl: 'https://github.com/example/3.zip',
      artifactDigest: 'sha256:3',
      workflowRunId: '3',
    });

    let artifacts1 = await artifactsManager.getArtifactsByFingerprintIdAsync(fingerprintId1);
    let artifacts2 = await artifactsManager.getArtifactsByFingerprintIdAsync(fingerprintId2);
    expect(artifacts1).toHaveLength(2);
    expect(artifacts2).toHaveLength(1);

    await artifactsManager.deleteArtifactsByFingerprintIdAsync(fingerprintId1);

    artifacts1 = await artifactsManager.getArtifactsByFingerprintIdAsync(fingerprintId1);
    artifacts2 = await artifactsManager.getArtifactsByFingerprintIdAsync(fingerprintId2);
    expect(artifacts1).toHaveLength(0);
    expect(artifacts2).toHaveLength(1);
    expect(artifacts2[0]?.platform).toBe('web');
  });
});
