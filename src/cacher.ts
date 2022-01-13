import { saveCache, restoreCache, ReserveCacheError } from '@actions/cache';
import { warning } from '@actions/core';
import os from 'os';

import { findTool } from './worker';

/**
 * Restore a tool from the remote cache.
 * This will install the tool back into the local tool cache.
 */
export async function restoreFromCache(name: string, version: string, manager: string) {
  const dir = findTool(name, version)!;
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
  try {
    await saveCache([findTool(name, version)!], cacheKey(name, version, manager));
  } catch (error) {
    handleCacheError(error);
  }
}

export function cacheKey(name: string, version: string, manager: string): string {
  return `${name}-${process.platform}-${os.arch()}-${manager}-${version}`;
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
export function handleCacheError(error: Error): void {
  const isReserveCacheError = error instanceof ReserveCacheError;
  const isCacheUnavailable = error.message.toLowerCase().includes('cache service url not found');

  if (isReserveCacheError || isCacheUnavailable) {
    warning('Skipped remote cache, encountered error:');
    warning(error.message);
  } else {
    throw error;
  }
}
