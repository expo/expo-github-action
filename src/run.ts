import { addPath, getInput } from '@actions/core';
import { authenticate } from './expo';
import { install } from './install';
import { patchWatchers } from './system';

export async function run() {
	const path = await install({
		version: getInput('expo-version') || 'latest',
		packager: getInput('expo-packager') || 'yarn',
		cache: (getInput('expo-cache') || 'false') === 'true',
		cacheKey: getInput('expo-cache-key') || undefined,
	});

	addPath(path);

	await authenticate({
		token: getInput('expo-token') || undefined,
		username: getInput('expo-username') || undefined,
		password: getInput('expo-password') || undefined,
	});

	const shouldPatchWatchers = getInput('expo-patch-watchers') || 'true';

	if (shouldPatchWatchers !== 'false') {
		await patchWatchers();
	}
}
