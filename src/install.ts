import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import {
	fromLocalCache,
	fromRemoteCache,
	toLocalCache,
	toRemoteCache,
} from './cache';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const registry = require('libnpm');

interface InstallConfig {
	version: string;
	packager: string;
	cache?: boolean;
	cacheKey?: string;
}

/**
 * Resolve the provided semver to exact version of `expo-cli`.
 * This uses the npm registry and accepts latest, dist-tags or version ranges.
 * It's used to determine the cached version of `expo-cli`.
 */
export async function resolve(version: string) {
	return (await registry.manifest(`expo-cli@${version}`)).version;
}

/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
export async function install(config: InstallConfig) {
	const exact = await resolve(config.version);
	let root: string | undefined = await fromLocalCache(exact);

	if (!root && config.cache) {
		root = await fromRemoteCache(exact, config.packager, config.cacheKey);
	} else {
		core.info('Skipping remote cache, not enabled...');
	}

	if (!root) {
		root = await fromPackager(exact, config.packager)
		root = await toLocalCache(root, exact);

		if (config.cache) {
			await toRemoteCache(root, exact, config.packager, config.cacheKey);
		}
	}

	return path.join(root, 'node_modules', '.bin');
}

/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
export async function fromPackager(version: string, packager: string) {
	const root = process.env['RUNNER_TEMP'] || '';
	const tool = await io.which(packager);

	await io.mkdirP(root);
	await cli.exec(tool, ['add', `expo-cli@${version}`], { cwd: root });

	return root;
}
