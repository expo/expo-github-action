import * as cache from '@actions/cache';
import os from 'os';

import { cacheKey, restoreFromCache, saveToCache } from '../src/cacher';
import { toolPath } from '../src/worker';
import { resetEnv, setEnv } from './utils';

jest.mock('@actions/cache');
jest.mock('@actions/core');

beforeAll(() => {
  setEnv('RUNNER_TOOL_CACHE', os.tmpdir());
});

afterAll(resetEnv);

describe(cacheKey, () => {
  it('returns contains package name, version, and manager', () => {
    expect(cacheKey('expo-cli', '5.0.3', 'yarn')).toMatch('expo-cli');
    expect(cacheKey('expo-cli', '5.0.3', 'yarn')).toMatch('5.0.3');
    expect(cacheKey('eas-cli', '5.0.3', 'npm')).toMatch('npm');
  });

  it('contains the os arch type', () => {
    expect(cacheKey('eas-cli', '5.0.3', 'yarn')).toMatch(os.arch());
  });

  it('contains the platform type', () => {
    expect(cacheKey('eas-cli', '5.0.3', 'yarn')).toMatch(process.platform);
  });
});

describe(restoreFromCache, () => {
  it('skips when cache is unavailable', async () => {
    jest.mocked(cache.restoreCache).mockRejectedValue(new Error('Cache service url not found'));
    await expect(restoreFromCache('expo-cli', '5.0.3', 'yarn')).resolves.toBeUndefined();
  });

  it('throws when cache has unexpected error', async () => {
    jest.mocked(cache.restoreCache).mockRejectedValue(new Error('Node registry is down'));
    await expect(restoreFromCache('expo-cli', '5.0.3', 'yarn')).rejects.toThrow('Node registry is down');
  });

  it('returns expo-cli path from cache when available', async () => {
    jest.mocked(cache.restoreCache).mockResolvedValue('fake/path');
    await expect(restoreFromCache('expo-cli', '5.0.3', 'yarn')).resolves.toBe(toolPath('expo-cli', '5.0.3'));
  });

  it('returns nothing when cache is empty', async () => {
    jest.mocked(cache.restoreCache).mockResolvedValue(undefined);
    await expect(restoreFromCache('eas-cli', '0.46.2', 'npm')).resolves.toBeUndefined();
  });
});

describe(saveToCache, () => {
  it('skips when cache is unavailable', async () => {
    jest.mocked(cache.saveCache).mockRejectedValue(new Error('Cache service url not found'));
    await expect(saveToCache('expo-cli', '5.0.3', 'yarn')).resolves.toBeUndefined();
  });

  it('throws when cache has unexpected error', async () => {
    jest.mocked(cache.saveCache).mockRejectedValue(new Error('Node registry is down'));
    await expect(saveToCache('expo-cli', '5.0.3', 'yarn')).rejects.toThrow('Node registry is down');
  });

  it('saves expo-cli to cache when available', async () => {
    jest.mocked(cache.saveCache).mockResolvedValue(1337);
    await expect(saveToCache('expo-cli', '5.0.3', 'yarn')).resolves.toBeUndefined();
  });
});
