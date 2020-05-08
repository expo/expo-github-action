import * as core from '@actions/core';
import * as cli from '@actions/exec';

/**
 * Authenticate at Expo using `expo login`.
 * This step is required for publishing and building new apps.
 * It uses the `EXPO_CLI_PASSWORD` environment variable for improved security.
 */
export async function authenticate(username: string, password: string) {
	if (!username || !password) {
		return core.info('Skipping authentication, `expo-username` and/or `expo-password` not set...');
	}

	// github actions toolkit will handle commands with `.cmd` on windows, we need that
	const bin = process.platform === 'win32'
		? 'expo.cmd'
		: 'expo';

	await cli.exec(bin, ['login', `--username=${username}`], {
		env: {
			...process.env,
			EXPO_CLI_PASSWORD: password,
		},
	});
}
