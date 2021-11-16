import { addPath, getInput, group, info } from '@actions/core';

import { install } from '../install';
import * as tools from '../tools';

// Auto-execute in GitHub actions
tools.performAction(setupAction);

export async function setupAction(): Promise<void> {
	const expoVersion = await installCli('expo-cli');
	const easVersion = await installCli('eas-cli');

	await group('Checking current authenticated account', () =>
		tools.maybeAuthenticate({
			cli: expoVersion ? 'expo-cli' : easVersion ? 'eas-cli' : undefined,
			token: getInput('token') || undefined,
			username: getInput('username') || undefined,
			password: getInput('password') || undefined,
		})
	);

	if (tools.getBoolean(getInput('patch-watchers'), true)) {
		await group('Patching system watchers for the `ENOSPC` error', () => tools.maybePatchWatchers());
	}
}

async function installCli(name: tools.PackageName): Promise<string | void> {
	const shortName = tools.getBinaryName(name);
	const inputVersion = getInput(`${shortName}-version`);
	const packager = getInput('packager') || 'yarn';

	if (!inputVersion) {
		return info(`Skipping installation of ${name}, \`${shortName}-version\` not provided.`);
	}

	const version = await tools.resolveVersion(name, inputVersion);
	const cache = tools.getBoolean(getInput(`${shortName}-cache`), false);

	try {
		const path = await group(
			cache
				? `Installing ${name} (${version}) from cache or with ${packager}`
				: `Installing ${name} (${version}) with ${packager}`,
			() =>
				install({
					packager,
					version,
					cache,
					package: name,
					cacheKey: getInput(`${shortName}-cache-key`) || undefined,
				})
		);

		addPath(path);
	} catch (error) {
		tools.handleError(name, error);
	}

	return version;
}
