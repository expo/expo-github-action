import type { FingerprintSource } from '@expo/fingerprint';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { FingerprintDbManager } from '../../fingerprint/FingerprintDbManager';
import { delayAsync } from '../../utils';

describe(FingerprintDbManager, () => {
  let fingerprintDbManager: FingerprintDbManager;

  beforeEach(async () => {
    fingerprintDbManager = new FingerprintDbManager(':memory:');
    await fingerprintDbManager.initAsync();
  });

  afterEach(async () => {
    await fingerprintDbManager.closeAsync();
  });

  it('queryEasBuildIdsFromFingerprintAsync', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'id1',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    expect(await fingerprintDbManager.queryEasBuildIdsFromFingerprintAsync('nonExistedId')).toEqual(
      []
    );
    expect(await fingerprintDbManager.queryEasBuildIdsFromFingerprintAsync('hash1')).toEqual([
      'id1',
    ]);
  });

  it('getFingerprintSourcesAsync', async () => {
    const sources: FingerprintSource[] = [
      {
        type: 'file',
        filePath: './assets/icon.png',
        reasons: ['expoConfigExternalFile'],
        hash: '3f71f5a8458c06b83424cc33e1f2481f601199ea',
      },
      {
        type: 'dir',
        filePath: 'node_modules/expo',
        reasons: ['expoAutolinkingIos', 'expoAutolinkingAndroid'],
        hash: 'ae5d1bd2395e8766c1a1394ce948bf6003b4fd25',
      },
      {
        type: 'contents',
        id: 'packageJson:scripts',
        contents:
          '{"start":"expo start","android":"expo run:android","ios":"expo run:ios","web":"expo start --web"}',
        reasons: ['packageJson:scripts'],
        hash: '119dec73c92445762a48c9455d9f34a643be8cf0',
      },
    ];
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'id1',
      fingerprint: { sources, hash: 'hash1' },
    });
    expect(await fingerprintDbManager.getFingerprintSourcesAsync('nonExistedId')).toBe(null);
    expect(await fingerprintDbManager.getFingerprintSourcesAsync('hash1')).toEqual(sources);
  });

  it('getEntityFromGitCommitHashAsync', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'id1',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    expect(await fingerprintDbManager.getEntityFromGitCommitHashAsync('nonExistedHash')).toBe(null);
    const result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.easBuildId).toEqual('id1');
    expect(result?.gitCommitHash).toEqual('gitHash');
    expect(result?.fingerprintHash).toEqual('hash1');
    expect(result?.fingerprint).toEqual({ sources: [], hash: 'hash1' });
  });

  it('getFirstEntityFromFingerprintHashAsync', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      fingerprint: {
        sources: [],
        hash: 'hash1',
      },
    });
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
      easBuildId: 'id1',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    const result = await fingerprintDbManager.getFirstEntityFromFingerprintHashAsync('hash1');
    expect(result?.gitCommitHash).toBe('gitHash1');
  });

  it('queryEntitiesFromFingerprintHashAsync', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      fingerprint: {
        sources: [],
        hash: 'hash1',
      },
    });
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
      easBuildId: 'id1',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    const results = await fingerprintDbManager.queryEntitiesFromFingerprintHashAsync('hash1');
    expect(results.length).toBe(2);
    expect(results[0].gitCommitHash).toBe('gitHash1');
    expect(results[1].gitCommitHash).toBe('gitHash2');
  });

  it('upsertFingerprintByGitCommitHashAsync should update existing data', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: '',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    let result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.fingerprintHash).toEqual('hash1');

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'easBuildId',
      fingerprint: { sources: [], hash: 'hash2' },
    });
    result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.easBuildId).toEqual('easBuildId');
    expect(result?.fingerprintHash).toEqual('hash2');
    expect(result?.fingerprint).toEqual({ sources: [], hash: 'hash2' });
  });

  it('createdAt value should be auto generated', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: '',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    const result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.createdAt).not.toBe(null);
  });

  it('updatedAt value should be auto updated', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: '',
      fingerprint: { sources: [], hash: 'hash1' },
    });
    let result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.updatedAt).not.toBe(null);
    const previousUpdatedAt = result?.updatedAt;

    await delayAsync(1000);

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'buildId',
      fingerprint: { sources: [], hash: 'hash2' },
    });
    result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.updatedAt).not.toEqual(previousUpdatedAt);
  });

  it('getLatestEasEntityFromFingerprintAsync should return the latest entity', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
      easBuildId: '',
      fingerprint: { sources: [], hash: 'hash1' },
    });

    await delayAsync(1000);

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      easBuildId: 'buildId',
      fingerprint: { sources: [], hash: 'hash1' },
    });

    await delayAsync(1000);

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash3', {
      easBuildId: '',
      fingerprint: { sources: [], hash: 'hash1' },
    });

    const result = await fingerprintDbManager.getLatestEasEntityFromFingerprintAsync('hash1');
    expect(result?.gitCommitHash).toEqual('gitHash1');
  });

  it('should include githubArtifactId and platform in entity serialization', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'id1',
      fingerprint: { sources: [], hash: 'hash1' },
      platform: 'android',
    });

    const result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.githubArtifactId).toBe(null);
    expect(result).toHaveProperty('githubArtifactId');
    expect(result?.platform).toBe('android');
    expect(result).toHaveProperty('platform');
  });

  it('getFirstEntityWithGitHubArtifactFromFingerprintHashAsync should return entity with artifact', async () => {
    const testDbManager = new FingerprintDbManager(':memory:');
    await testDbManager.initAsync();

    await testDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      fingerprint: { sources: [], hash: 'hash1' },
      githubArtifact: {
        artifactId: 'artifact-123',
        artifactUrl: 'https://github.com/example/artifact.zip',
        artifactDigest: 'sha256:abc123',
        workflowRunId: '123',
      },
    });

    await testDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
      fingerprint: { sources: [], hash: 'hash1' },
    });

    const result =
      await testDbManager.getFirstEntityWithGitHubArtifactFromFingerprintHashAsync('hash1');
    expect(result?.gitCommitHash).toBe('gitHash1');
    expect(result?.githubArtifact?.artifactUrl).toBe('https://github.com/example/artifact.zip');
    expect(result?.githubArtifact?.artifactId).toBe('artifact-123');
    expect(result?.githubArtifact?.artifactDigest).toBe('sha256:abc123');

    const resultNoArtifact =
      await testDbManager.getFirstEntityWithGitHubArtifactFromFingerprintHashAsync('nonExistent');
    expect(resultNoArtifact).toBe(null);

    await testDbManager.closeAsync();
  });

  it('upsertFingerprintByGitCommitHashAsync should handle githubArtifact parameter', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      easBuildId: 'buildId1',
      fingerprint: { sources: [], hash: 'hash1' },
      githubArtifact: {
        artifactId: 'artifact-update-test',
        artifactUrl: 'https://github.com/example/artifact1.zip',
        artifactDigest: 'sha256:original',
        workflowRunId: '123',
      },
    });

    const result1 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
    expect(result1?.githubArtifactId).toBeGreaterThan(0);

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      easBuildId: 'buildId1Updated',
      fingerprint: { sources: [], hash: 'hash1Updated' },
      githubArtifact: {
        artifactId: 'artifact-update-test-updated',
        artifactUrl: 'https://github.com/example/artifact1-updated.zip',
        artifactDigest: 'sha256:updated',
        workflowRunId: '123',
      },
    });

    const result2 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
    expect(result2?.githubArtifactId).toBeGreaterThan(0);
    expect(result2?.easBuildId).toBe('buildId1Updated');
  });

  it('upsertFingerprintByGitCommitHashAsync should handle platform parameter', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHashIos', {
      easBuildId: 'iosBuildId',
      fingerprint: { sources: [], hash: 'iosHash' },
      platform: 'ios',
    });

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHashAndroid', {
      easBuildId: 'androidBuildId',
      fingerprint: { sources: [], hash: 'androidHash' },
      platform: 'android',
    });

    const iosResult = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHashIos');
    expect(iosResult?.platform).toBe('ios');

    const androidResult =
      await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHashAndroid');
    expect(androidResult?.platform).toBe('android');
  });

  it('database initialization with migration system should work correctly', async () => {
    const tempDbPath = path.join(os.tmpdir(), `test-migration-${Date.now()}.db`);
    let migrationDbManager: FingerprintDbManager | null = null;

    try {
      // Test that a fresh database initializes correctly
      migrationDbManager = new FingerprintDbManager(tempDbPath);
      await migrationDbManager.initAsync();

      // Test that we can insert and retrieve data with new schema
      await migrationDbManager.upsertFingerprintByGitCommitHashAsync('testGitHash', {
        easBuildId: 'testEasBuildId',
        fingerprint: { sources: [], hash: 'testFingerprintHash' },
        platform: 'ios',
        githubArtifact: {
          artifactId: 'test-artifact',
          artifactUrl: 'https://github.com/example/test.zip',
          artifactDigest: 'sha256:test123',
          workflowRunId: '123',
        },
      });

      const record = await migrationDbManager.getEntityFromGitCommitHashAsync('testGitHash');
      expect(record).toBeTruthy();
      expect(record?.githubArtifactId).toBeGreaterThan(0);
      expect(record?.platform).toBe('ios');
      expect(record).toHaveProperty('githubArtifactId');
      expect(record).toHaveProperty('platform');

      await migrationDbManager.closeAsync();
      migrationDbManager = null;
    } finally {
      if (migrationDbManager) {
        await migrationDbManager.closeAsync();
      }
      await fs.promises.unlink(tempDbPath);
    }
  });
});
