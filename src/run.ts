import { addPath, getInput } from '@actions/core';
import { authenticate } from './expo';
import { install } from './install';
import { patchWatchers } from './system';

export async function run() {
	const path = await install(
		getInput('expo-version') || 'latest',
		getInput('expo-packager') || 'yarn',
	);

	addPath(path);

	await authenticate(
		getInput('expo-username'),
		getInput('expo-password'),
	);

	const shouldPatchWatchers = getInput('expo-patch-watchers') || 'true';

	if (shouldPatchWatchers !== 'false') {
		await patchWatchers();
	}
}
