import { ReserveCacheError, restoreCache, saveCache } from '@actions/cache';
import * as toolCache from '@actions/tool-cache';
import path from 'path';
import os from 'os';

/**
 * Get the path to the `expo-cli` from cache, if any.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
export async function fromLocalCache(version: string) {
	return toolCache.find('expo-cli', version);
}

/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
export async function toLocalCache(root: string, version: string) {
	return toolCache.cacheDir(root, 'expo-cli', version);
}

/**
 * Download the remotely stored `expo-cli` from cache, if any.
 * Note, this cache is shared between jobs.
 */
export async function fromRemoteCache(version: string, packager: string, customCacheKey?: string) {
	// see: https://github.com/actions/toolkit/blob/8a4134761f09d0d97fb15f297705fd8644fef920/packages/tool-cache/src/tool-cache.ts#L401
	const target = path.join(process.env['RUNNER_TOOL_CACHE'] || '', 'expo-cli', version, os.arch());
	const cacheKey = customCacheKey || getRemoteKey(version, packager);
	const hit = await restoreCache([target], cacheKey);

	if (hit) {
		return target;
	}
}

/**
 * Store the root of `expo-cli` in the remote cache, for future reuse.
 * Note, this cache is shared between jobs.
 */
export async function toRemoteCache(source: string, version: string, packager: string, customCacheKey?: string) {
	const cacheKey = customCacheKey || getRemoteKey(version, packager);

	try {
		await saveCache([source], cacheKey);
	} catch (error) {
		if (error instanceof ReserveCacheError) {
			console.log(`Skipping cache save: ${error.message}`);
		} else throw error;
	}
}

/**
 * Get the cache key to use when (re)storing the Expo CLI from remote cache.
 */
function getRemoteKey(version: string, packager: string) {
	return `expo-cli-${process.platform}-${os.arch()}-${packager}-${version}`;
}
