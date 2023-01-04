import { saveCache, restoreCache, ReserveCacheError, isFeatureAvailable } from '@actions/cache';
import { warning } from '@actions/core';
import os from 'os';

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
 * Restore a tool from the remote cache.
 * This will install the tool back into the local tool cache.
 */
export async function restoreFromCache(name: string, version: string, manager: string) {
  const dir = toolPath(name, version)!;

  if (!cacheIsAvailable()) {
    warning(`Skipped restoring from remote cache, not available.`);
    return undefined;
  }

  try {
    if (await restoreCache([dir], cacheKey(name, version, manager))) {
      return dir;
    }
  } catch (error) {
    handleCacheError(error);
  }
}

/**
 * Save a tool to the remote cache.
 * This will fetch the tool from the local tool cache.
 */
export async function saveToCache(name: string, version: string, manager: string) {
  if (!cacheIsAvailable()) {
    warning(`Skipped saving to remote cache, not available.`);
    return undefined;
  }

  try {
    await saveCache([toolPath(name, version)], cacheKey(name, version, manager));
  } catch (error) {
    handleCacheError(error);
  }
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
