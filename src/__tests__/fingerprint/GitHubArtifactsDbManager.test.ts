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

  it('upsertArtifactAsync should insert new artifact when not exists', async () => {
    const id = await artifactsManager.upsertArtifactAsync({
      artifactId: 'artifact-new',
      artifactUrl: 'https://github.com/example/new.zip',
      artifactDigest: 'sha256:new123',
      workflowRunId: '789',
    });

    expect(id).toBeGreaterThan(0);

    const result = await artifactsManager.getArtifactByIdAsync(id);
    expect(result?.artifactId).toBe('artifact-new');
    expect(result?.artifactUrl).toBe('https://github.com/example/new.zip');
    expect(result?.artifactDigest).toBe('sha256:new123');
  });

  it('upsertArtifactAsync should update existing artifact when exists', async () => {
    const originalId = await artifactsManager.insertArtifactAsync({
      artifactId: 'artifact-update',
      artifactUrl: 'https://github.com/example/original.zip',
      artifactDigest: 'sha256:original',
      workflowRunId: '123',
    });

    const upsertId = await artifactsManager.upsertArtifactAsync({
      artifactId: 'artifact-update',
      artifactUrl: 'https://github.com/example/updated.zip',
      artifactDigest: 'sha256:updated',
      workflowRunId: '123',
    });

    expect(upsertId).toBe(originalId);

    const result = await artifactsManager.getArtifactByIdAsync(originalId);
    expect(result?.artifactId).toBe('artifact-update');
    expect(result?.artifactUrl).toBe('https://github.com/example/updated.zip');
    expect(result?.artifactDigest).toBe('sha256:updated');
  });

  it('deleteArtifactByIdAsync should delete artifact', async () => {
    const id = await artifactsManager.insertArtifactAsync({
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
});
