import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';

import { fromLocalCache, fromRemoteCache, toLocalCache, toRemoteCache } from './cache';

export type InstallConfig = {
	version: string;
	packager: string;
	cache?: boolean;
	cacheKey?: string;
};

/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
export async function install(config: InstallConfig): Promise<string> {
	let root: string | undefined = await fromLocalCache(config.version);

	if (!root && config.cache) {
		root = await fromRemoteCache(config.version, config.packager, config.cacheKey);
	} else {
		core.info('Skipping remote cache, not enabled...');
	}

	if (!root) {
		root = await fromPackager(config.version, config.packager);
		root = await toLocalCache(root, config.version);

		if (config.cache) {
			await toRemoteCache(root, config.version, config.packager, config.cacheKey);
		}
	}

	return path.join(root, 'node_modules', '.bin');
}

/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
export async function fromPackager(version: string, packager: string): Promise<string> {
	const root = process.env['RUNNER_TEMP'] || '';
	const tool = await io.which(packager);

	await io.mkdirP(root);
	await cli.exec(tool, ['add', `expo-cli@${version}`], { cwd: root });

	return root;
}
