import { addPath, getInput, group } from '@actions/core';
import { authenticate } from './expo';
import { install, InstallConfig } from './install';
import { patchWatchers } from './system';

export async function run(): Promise<void> {
	const config: InstallConfig = {
		version: getInput('expo-version') || 'latest',
		packager: getInput('expo-packager') || 'yarn',
		cache: (getInput('expo-cache') || 'false') === 'true',
		cacheKey: getInput('expo-cache-key') || undefined,
	};

	const path = await group(
		config.cache
			? `Installing Expo CLI from cache or with ${config.packager}`
			: `Installing Expo CLI with ${config.packager}`,
		() => install(config),
	);

	addPath(path);

	await group(
		'Checking current authenticated account',
		() => authenticate({
			token: getInput('expo-token') || undefined,
			username: getInput('expo-username') || undefined,
			password: getInput('expo-password') || undefined,
		}),
	);

	const shouldPatchWatchers = getInput('expo-patch-watchers') || 'true';

	if (shouldPatchWatchers !== 'false') {
		await group(
			'Patching system watchers for the `ENOSPC` error',
			() => patchWatchers(),
		);
	}
}
