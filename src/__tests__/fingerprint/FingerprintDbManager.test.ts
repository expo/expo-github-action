import type { FingerprintSource } from '@expo/fingerprint';

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
});
