import { ReserveCacheError } from '@actions/cache';
import * as core from '@actions/core';
import { describe, expect, it, mock, spyOn } from 'bun:test';

import { downloadCache, uploadCache } from '../caches';

describe(downloadCache, () => {
  it('aborts when cache is unavailable', async () => {
    mock.module('@actions/cache', () => ({ isFeatureAvailable: mock().mockReturnValue(false) }));
    const warning = spyOn(core, 'warning').mockImplementation(mock());
    await expect(downloadCache('/test', 'test-key')).resolves.toBeNull();
    expect(warning).toHaveBeenCalledWith('GitHub Actions cache is not available, skipping cache.');
  });

  it('returns null when cache is not hit', async () => {
    const restoreCache = mock().mockResolvedValue(undefined);
    mock.module('@actions/cache', () => ({
      isFeatureAvailable: mock().mockReturnValue(true),
      restoreCache,
    }));
    await expect(downloadCache('/test', 'test-key')).resolves.toBeNull();
    expect(restoreCache).toHaveBeenCalledWith(['/test'], 'test-key');
  });

  it('returns cache path when cache is hit', async () => {
    mock.module('@actions/cache', () => ({
      isFeatureAvailable: mock().mockReturnValue(true),
      restoreCache: mock().mockResolvedValue('test-key-hit'),
    }));
    await expect(downloadCache('/test', 'test-key')).resolves.toBe('/test');
  });

  // When running jobs in parallel, the cache might throw an error where one job reserved the cache
  it('warns when cache throws ReserveCacheError', async () => {
    mock.module('@actions/cache', () => ({
      isFeatureAvailable: mock().mockReturnValue(true),
      restoreCache: mock().mockRejectedValue(new ReserveCacheError('test')),
    }));
    const warning = spyOn(core, 'warning').mockImplementation(mock());
    await expect(downloadCache('/test', 'test-key')).resolves.toBeNull();
    expect(warning).toHaveBeenCalledWith(
      'Skipping GitHub Actions cache, cache is reserved by another job.'
    );
  });
});

describe(uploadCache, () => {
  it('aborts when cache is unavailable', async () => {
    mock.module('@actions/cache', () => ({ isFeatureAvailable: mock().mockReturnValue(false) }));
    const warning = spyOn(core, 'warning').mockImplementation(mock());
    await expect(uploadCache('/test', 'test-key')).resolves;
    expect(warning).toHaveBeenCalledWith('GitHub Actions cache is not available, skipping cache.');
  });

  it('uploads cache when available', async () => {
    const saveCache = mock().mockResolvedValue(undefined);
    mock.module('@actions/cache', () => ({
      isFeatureAvailable: mock().mockReturnValue(true),
      saveCache,
    }));
    await expect(uploadCache('/test', 'test-key')).resolves;
    expect(saveCache).toHaveBeenCalledWith(['/test'], 'test-key');
  });

  // When running jobs in parallel, the cache might throw an error where one job reserved the cache
  it('warns when cache throws ReserveCacheError', async () => {
    mock.module('@actions/cache', () => ({
      isFeatureAvailable: mock().mockReturnValue(true),
      saveCache: mock().mockRejectedValue(new ReserveCacheError('test')),
    }));
    const warning = spyOn(core, 'warning').mockImplementation(mock());
    await expect(uploadCache('/test', 'test-key')).resolves;
    expect(warning).toHaveBeenCalledWith(
      'Skipping GitHub Actions cache, cache is reserved by another job.'
    );
  });
});
