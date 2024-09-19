import { ReserveCacheError, isFeatureAvailable, restoreCache, saveCache } from '@actions/cache';
import { warning } from '@actions/core';
import { context } from '@actions/github';
import os from 'os';

import { githubApi } from './github';
import { toolPath } from './worker';

/**
 * Determine if the remote cache is available and can be used.
 */
export function cacheIsAvailable(): boolean {
  return isFeatureAvailable();
}

/**
 * Get the exact cache key for the package.
 * We can prefix this when there are breaking changes in this action.
 */
export function cacheKey(name: string, version: string, manager: string): string {
  return `${name}-${process.platform}-${os.arch()}-${manager}-${version}`;
}

/**
 * Restore a directory from the remote cache.
 */
export async function restoreCacheAsync(
  cachePath: string,
  cacheKey: string
): Promise<string | null> {
  if (!cacheIsAvailable()) {
    warning(`Skipped restoring from remote cache, not available.`);
    return null;
  }

  try {
    if (await restoreCache([cachePath], cacheKey)) {
      return cachePath;
    }
  } catch (error) {
    handleCacheError(error);
  }
  return null;
}

/**
 * Save a directory to the remote cache.
 */
export async function saveCacheAsync(cachePath: string, cacheKey: string): Promise<void> {
  if (!cacheIsAvailable()) {
    warning(`Skipped saving to remote cache, not available.`);
    return;
  }

  try {
    await saveCache([cachePath], cacheKey);
  } catch (error) {
    handleCacheError(error);
  }
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

/**
 * Restore a tool from the remote cache.
 * This will install the tool back into the local tool cache.
 */
export function restoreFromCache(name: string, version: string, manager: string) {
  return restoreCacheAsync(toolPath(name, version), cacheKey(name, version, manager));
}

/**
 * Save a tool to the remote cache.
 * This will fetch the tool from the local tool cache.
 */
export function saveToCache(name: string, version: string, manager: string) {
  return saveCacheAsync(toolPath(name, version), cacheKey(name, version, manager));
}

/**
 * Try to handle incoming cache errors.
 * Because workers can operate in environments without cache configured,
 * we need to make sure to only skip the cache instead of fail.
 *
 * Currently we handle these types of errors:
 *   - ReserveCacheError
 *   - "cache service url not found"
 */
export function handleCacheError(error: Error | unknown): void {
  const isReserveCacheError = error instanceof ReserveCacheError;

  if (isReserveCacheError) {
    warning('Skipped remote cache, encountered error:');
    warning(error.message);
  } else {
    throw error;
  }
}
