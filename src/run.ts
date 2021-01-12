import { addPath, getInput, group } from '@actions/core';

import { install, InstallConfig } from './install';
import { maybeAuthenticate, maybePatchWatchers, resolveVersion } from './tools';

export async function run(): Promise<void> {
	const config: InstallConfig = {
		version: getInput('expo-version') || 'latest',
		packager: getInput('expo-packager') || 'yarn',
		cache: (getInput('expo-cache') || 'false') === 'true',
		cacheKey: getInput('expo-cache-key') || undefined,
	};

	// Resolve the exact requested Expo CLI version
	config.version = await resolveVersion(config.version);

	const path = await group(
		config.cache
			? `Installing Expo CLI (${config.version}) from cache or with ${config.packager}`
			: `Installing Expo CLI (${config.version}) with ${config.packager}`,
		() => install(config),
	);

	addPath(path);

	await group(
		'Checking current authenticated account',
		() => maybeAuthenticate({
			token: getInput('expo-token') || undefined,
			username: getInput('expo-username') || undefined,
			password: getInput('expo-password') || undefined,
		}),
	);

	const shouldPatchWatchers = getInput('expo-patch-watchers') || 'true';

	if (shouldPatchWatchers !== 'false') {
		await group(
			'Patching system watchers for the `ENOSPC` error',
			() => maybePatchWatchers(),
		);
	}
}
