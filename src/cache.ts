import { ReserveCacheError, restoreCache, saveCache } from '@actions/cache';
import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import path from 'path';
import os from 'os';

import type { InstallConfig } from './install';

export type CacheConfig = Omit<InstallConfig, 'cache'>;

/**
 * Get the path to the `expo-cli` from cache, if any.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
export async function fromLocalCache(config: CacheConfig): Promise<string | undefined> {
	return toolCache.find(config.package, config.version);
}

/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Note, this cache is **NOT** shared between jobs.
 *
 * @see https://github.com/actions/toolkit/issues/47
 */
export async function toLocalCache(root: string, config: CacheConfig): Promise<string> {
	return toolCache.cacheDir(root, config.package, config.version);
}

/**
 * Download the remotely stored `expo-cli` from cache, if any.
 * Note, this cache is shared between jobs.
 */
export async function fromRemoteCache(config: CacheConfig): Promise<string | undefined> {
	// see: https://github.com/actions/toolkit/blob/8a4134761f09d0d97fb15f297705fd8644fef920/packages/tool-cache/src/tool-cache.ts#L401
	const target = path.join(process.env['RUNNER_TOOL_CACHE'] || '', config.package, config.version, os.arch());
	const cacheKey = config.cacheKey || getRemoteKey(config);

	try {
		// When running with nektos/act, or other custom environments, the cache might not be set up.
		const hit = await restoreCache([target], cacheKey);
		if (hit) {
			return target;
		}
	} catch (error) {
		if (!handleRemoteCacheError(error)) {
			throw error;
		}
	}
}

/**
 * Store the root of `expo-cli` in the remote cache, for future reuse.
 * Note, this cache is shared between jobs.
 */
export async function toRemoteCache(source: string, config: CacheConfig): Promise<void> {
	const cacheKey = config.cacheKey || getRemoteKey(config);

	try {
		await saveCache([source], cacheKey);
	} catch (error) {
		if (!handleRemoteCacheError(error)) {
			throw error;
		}
	}
}

/**
 * Get the cache key to use when (re)storing the Expo CLI from remote cache.
 */
function getRemoteKey(config: Omit<CacheConfig, 'cacheKey'>): string {
	return `${config.package}-${process.platform}-${os.arch()}-${config.packager}-${config.version}`;
}

/**
 * Handle any incoming errors from cache methods.
 * This can include actual errors like `ReserveCacheErrors` or unavailability errors.
 * When the error is handled, it MUST provide feedback for the developer.
 *
 * @returns If the error was handled properly.
 */
function handleRemoteCacheError(error: Error): boolean {
	const isReserveCacheError = error instanceof ReserveCacheError;
	const isCacheUnavailable = error.message.toLowerCase().includes(
		'cache service url not found',
	);

	if (isReserveCacheError || isCacheUnavailable) {
		core.warning('Skipping remote cache storage, encountered error:');
		core.warning(error.message);
		return true;
	}

	return false;
}
