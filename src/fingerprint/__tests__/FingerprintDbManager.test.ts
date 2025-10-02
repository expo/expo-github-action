import type { FingerprintSource } from '@expo/fingerprint';
import { sleep } from 'bun';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

    // Use sleep for true delay
    await sleep(1000);

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

  it('should include platform in entity serialization', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash', {
      easBuildId: 'id1',
      fingerprint: { sources: [], hash: 'hash1' },
      platform: 'android',
    });

    const result = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash');
    expect(result?.platform).toBe('android');
    expect(result).toHaveProperty('platform');
  });

  it('upsertFingerprintByGitCommitHashAsync should handle updates correctly', async () => {
    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      easBuildId: 'buildId1',
      fingerprint: { sources: [], hash: 'hash1' },
    });

    const result1 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
    expect(result1?.id).toBeGreaterThan(0);

    await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
      easBuildId: 'buildId1Updated',
      fingerprint: { sources: [], hash: 'hash1Updated' },
    });

    const result2 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
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

  describe('FingerprintDbManager - getFirstGitHubArtifactAsync', () => {
    it('should return first artifact matching fingerprint hash and platform', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'hash1' },
        platform: 'ios',
      });

      const fingerprint = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-ios-1',
        artifactUrl: 'https://github.com/example/ios1.zip',
        artifactDigest: 'sha256:ios1',
        workflowRunId: '123',
        platform: 'ios',
      });

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-ios-2',
        artifactUrl: 'https://github.com/example/ios2.zip',
        artifactDigest: 'sha256:ios2',
        workflowRunId: '124',
        platform: 'ios',
      });

      const iosResult = await fingerprintDbManager.getFirstGitHubArtifactAsync('hash1', 'ios');
      expect(iosResult).toBeTruthy();
      expect(iosResult?.artifactId).toBe('artifact-ios-1');
      expect(iosResult?.platform).toBe('ios');
      expect(iosResult?.artifactUrl).toBe('https://github.com/example/ios1.zip');
    });

    it('should return artifact from fingerprint with null platform', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
        fingerprint: { sources: [], hash: 'hash2' },
      });

      const fingerprint = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash2');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-android-1',
        artifactUrl: 'https://github.com/example/android1.zip',
        artifactDigest: 'sha256:android1',
        workflowRunId: '125',
        platform: 'android',
      });

      const androidResult = await fingerprintDbManager.getFirstGitHubArtifactAsync(
        'hash2',
        'android'
      );
      expect(androidResult).toBeTruthy();
      expect(androidResult?.artifactId).toBe('artifact-android-1');
      expect(androidResult?.platform).toBe('android');
    });

    it('should return null when platform does not match', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'hash1' },
        platform: 'ios',
      });

      const fingerprint = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-ios',
        artifactUrl: 'https://github.com/example/ios.zip',
        artifactDigest: 'sha256:ios',
        workflowRunId: '123',
        platform: 'ios',
      });

      const result = await fingerprintDbManager.getFirstGitHubArtifactAsync('hash1', 'android');
      expect(result).toBe(null);
    });

    it('should return null when fingerprint hash does not exist', async () => {
      const result = await fingerprintDbManager.getFirstGitHubArtifactAsync('nonExistent', 'ios');
      expect(result).toBe(null);
    });

    it('should return null when fingerprint exists but has no artifacts', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'hash1' },
        platform: 'ios',
      });

      const result = await fingerprintDbManager.getFirstGitHubArtifactAsync('hash1', 'ios');
      expect(result).toBe(null);
    });

    it('should prioritize by fingerprint ID order', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
        fingerprint: { sources: [], hash: 'sameHash' },
        platform: 'ios',
      });

      const fingerprint2 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash2');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint2!.id,
        artifactId: 'artifact-second',
        artifactUrl: 'https://github.com/example/second.zip',
        artifactDigest: 'sha256:second',
        workflowRunId: '200',
        platform: 'ios',
      });

      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'sameHash' },
        platform: 'ios',
      });

      const fingerprint1 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint1!.id,
        artifactId: 'artifact-first',
        artifactUrl: 'https://github.com/example/first.zip',
        artifactDigest: 'sha256:first',
        workflowRunId: '100',
        platform: 'ios',
      });

      const result = await fingerprintDbManager.getFirstGitHubArtifactAsync('sameHash', 'ios');
      expect(result).toBeTruthy();
      expect(result?.artifactId).toBe('artifact-second');
    });

    it('should reject fingerprint with wrong platform even if artifact platform matches', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'hash1' },
        platform: 'android',
      });

      const fingerprint = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-ios',
        artifactUrl: 'https://github.com/example/ios.zip',
        artifactDigest: 'sha256:ios',
        workflowRunId: '123',
        platform: 'ios',
      });

      const result = await fingerprintDbManager.getFirstGitHubArtifactAsync('hash1', 'ios');
      expect(result).toBe(null);
    });

    it('should work with mixed platform configurations', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'mixedHash' },
        platform: 'ios',
      });

      const fingerprint1 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint1!.id,
        artifactId: 'artifact-ios-specific',
        artifactUrl: 'https://github.com/example/ios-specific.zip',
        artifactDigest: 'sha256:ios-specific',
        workflowRunId: '123',
        platform: 'ios',
      });

      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash2', {
        fingerprint: { sources: [], hash: 'mixedHash' },
      });

      const fingerprint2 = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash2');

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint2!.id,
        artifactId: 'artifact-android-universal',
        artifactUrl: 'https://github.com/example/android-universal.zip',
        artifactDigest: 'sha256:android-universal',
        workflowRunId: '124',
        platform: 'android',
      });

      const iosResult = await fingerprintDbManager.getFirstGitHubArtifactAsync('mixedHash', 'ios');
      expect(iosResult?.artifactId).toBe('artifact-ios-specific');

      const androidResult = await fingerprintDbManager.getFirstGitHubArtifactAsync(
        'mixedHash',
        'android'
      );
      expect(androidResult?.artifactId).toBe('artifact-android-universal');
    });

    it('should return first artifact when multiple artifacts match', async () => {
      await fingerprintDbManager.upsertFingerprintByGitCommitHashAsync('gitHash1', {
        fingerprint: { sources: [], hash: 'multiHash' },
        platform: 'ios',
      });

      const fingerprint = await fingerprintDbManager.getEntityFromGitCommitHashAsync('gitHash1');
      const artifactsManager = fingerprintDbManager.getArtifactsManager();

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-first',
        artifactUrl: 'https://github.com/example/first.zip',
        artifactDigest: 'sha256:first',
        workflowRunId: '100',
        platform: 'ios',
      });

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-second',
        artifactUrl: 'https://github.com/example/second.zip',
        artifactDigest: 'sha256:second',
        workflowRunId: '101',
        platform: 'ios',
      });

      await artifactsManager.insertArtifactAsync({
        fingerprintId: fingerprint!.id,
        artifactId: 'artifact-third',
        artifactUrl: 'https://github.com/example/third.zip',
        artifactDigest: 'sha256:third',
        workflowRunId: '102',
        platform: 'ios',
      });

      const result = await fingerprintDbManager.getFirstGitHubArtifactAsync('multiHash', 'ios');
      expect(result?.artifactId).toBe('artifact-first');
    });
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
      });

      const record = await migrationDbManager.getEntityFromGitCommitHashAsync('testGitHash');
      expect(record).toBeTruthy();
      expect(record?.id).toBeGreaterThan(0);
      expect(record?.platform).toBe('ios');
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
