import * as core from '@actions/core';
import * as cli from '@actions/exec';

type AuthOptions = {
	token?: string;
	username?: string;
	password?: string;
};

/**
 * Authenticate at Expo using `expo login`.
 * This step is required for publishing and building new apps.
 * It uses the `EXPO_CLI_PASSWORD` environment variable for improved security.
 */
export async function authWithCredentials(username?: string, password?: string) {
	if (!username || !password) {
		return core.info('Skipping authentication: `expo-username` and/or `expo-password` not set...');
	}

	// github actions toolkit will handle commands with `.cmd` on windows, we need that
	const bin = process.platform === 'win32' ? 'expo.cmd' : 'expo';

	await cli.exec(bin, ['login', `--username=${username}`], {
		env: {
			...process.env,
			EXPO_CLI_PASSWORD: password,
		},
	});
}

/**
 * Authenticate with Expo using `EXPO_TOKEN`.
 * This exports the EXPO_TOKEN environment variable for all future steps within the workflow.
 * It also double-checks if this token is valid and for what user, by running `expo whoami`.
 *
 * @see https://github.com/actions/toolkit/blob/905b2c7b0681b11056141a60055f1ba77358b7e9/packages/core/src/core.ts#L39
 */
export async function authWithToken(token?: string) {
	if (!token) {
		return core.info('Skipping authentication: `expo-token` not set...');
	}

	// github actions toolkit will handle commands with `.cmd` on windows, we need that
	const bin = process.platform === 'win32' ? 'expo.cmd' : 'expo';

	await cli.exec(bin, ['whoami'], {
		env: {
			...process.env,
			EXPO_TOKEN: token,
		},
	});

	core.exportVariable('EXPO_TOKEN', token);
}

/**
 * Authenticate with Expo using either the token or username/password method.
 * If both of them are set, token has priority.
 */
export function authenticate(options: AuthOptions) {
	if (options.token) {
		return authWithToken(options.token);
	}

	if (options.username || options.password) {
		return authWithCredentials(options.username, options.password);
	}

	core.info('Skipping authentication: `expo-token`, `expo-username`, and/or `expo-password` not set...');
}
