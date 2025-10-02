import * as cache from '@actions/cache';
import * as core from '@actions/core';
import { context } from '@actions/github';

import { githubApi } from './github';

/**
 * Download or restore from the remote persistent cache to the local folder.
 * This will warn and skip when the feature is not available, e.g. on custom runners.
 */
export async function downloadCache(cachePath: string, cacheKey: string) {
  if (!cache.isFeatureAvailable()) {
    core.warning('GitHub Actions cache is not available, skipping cache.');
    return null;
  }

  return await cache
    .restoreCache([cachePath], cacheKey)
    .then((cacheKeyHit) => (cacheKeyHit ? cachePath : null), handleCacheErrors);
}

/**
 * Upload or store the local folder to the remote persistent cache.
 * This will warn and skip when the feature is not available, e.g. on custom runners.
 */
export async function uploadCache(cachePath: string, cacheKey: string) {
  if (!cache.isFeatureAvailable()) {
    core.warning('GitHub Actions cache is not available, skipping cache.');
    return null;
  }

  await cache.saveCache([cachePath], cacheKey).catch(handleCacheErrors);
}

/**
 * Delete a cache key from the remote cache.
 * Note that is not using the official API from @actions/cache but using the GitHub API directly.
 */
export async function deleteCacheAsync(
  githubToken: string,
  cacheKey: string,
  ref: string
): Promise<void> {
  const github = githubApi({ token: githubToken });
  await github.rest.actions.deleteActionsCacheByKey({
    ...context.repo,
    key: cacheKey,
    ref,
  });
}

/** Handle caching errors that should not block the GitHub Action run */
function handleCacheErrors(error: unknown) {
  if (error instanceof cache.ReserveCacheError) {
    core.warning('Skipping GitHub Actions cache, cache is reserved by another job.');
    core.warning(error.message);
    return null;
  }

  throw error;
}
