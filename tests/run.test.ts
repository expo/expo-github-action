const core = {
	addPath: jest.fn(),
	getInput: jest.fn(),
	group: <T>(message: string, action: () => Promise<T>): Promise<T> => action(),
	info: jest.fn(),
};
const exec = { exec: jest.fn() };
const install = { install: jest.fn() };
const tools = {
	getBoolean: jest.fn((v, d) => v ? v === 'true' : d),
	getBinaryName: jest.fn(v => v.replace('-cli', '')),
	resolveVersion: jest.fn((n, v) => v),
	maybeAuthenticate: jest.fn(),
	maybePatchWatchers: jest.fn(),
};

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => exec);
jest.mock('../src/tools', () => tools);
jest.mock('../src/install', () => install);

import { run } from '../src/run';

describe('run', () => {
	it('patches the system when set to true', async () => {
		mockInput({ patchWatchers: 'true' });
		await run();
		expect(tools.maybePatchWatchers).toHaveBeenCalled();
	});

	it('patches the system when not set', async () => {
		mockInput({ patchWatchers: '' });
		await run();
		expect(tools.maybePatchWatchers).toHaveBeenCalled();
	});

	it('skips the system patch when set to false', async () => {
		mockInput({ patchWatchers: 'false' });
		await run();
		expect(tools.maybePatchWatchers).not.toHaveBeenCalled();
	});

	it('authenticates with provided credentials', async () => {
		mockInput({ username: 'bycedric', password: 'mypassword', patchWatchers: 'false' });
		await run();
		expect(tools.maybeAuthenticate).toBeCalledWith({ username: 'bycedric', password: 'mypassword' });
	});

	it('authenticates with provided token', async () => {
		mockInput({ token: 'ABC123', patchWatchers: 'false' });
		await run();
		expect(tools.maybeAuthenticate).toBeCalledWith({ token: 'ABC123' });
	});

	['expo', 'eas'].forEach(cliName => {
		const packageName = `${cliName}-cli`;

		describe(packageName, () => {
			it(`skips installation without \`${cliName}-version\``, async () => {
				mockInput();
				await run();
				expect(install.install).not.toBeCalledWith({ package: packageName });
			});

			it('installs with yarn by default', async () => {
				mockInput({ [`${cliName}Version`]: 'latest' });
				await run();
				expect(install.install).toBeCalledWith({
					package:
					packageName,
					version: 'latest',
					packager: 'yarn',
					cache: false,
				});
			});

			it('installs provided version with npm', async () => {
				mockInput({ [`${cliName}Version`]: '3.0.10', packager: 'npm' });
				await run();
				expect(install.install).toBeCalledWith({
					package: packageName,
					version: '3.0.10',
					packager: 'npm',
					cache: false,
				});
			});

			it('installs with yarn and cache enabled', async () => {
				mockInput({
					packager: 'yarn',
					[`${cliName}Version`]: '4.2.0',
					[`${cliName}Cache`]: 'true',
				});
				await run();
				expect(install.install).toBeCalledWith({
					package: packageName,
					version: '4.2.0',
					packager: 'yarn',
					cache: true,
				});
			});

			it('installs with yarn and custom cache key', async () => {
				mockInput({
					packager: 'yarn',
					[`${cliName}Version`]: '4.2.0',
					[`${cliName}Cache`]: 'true',
					[`${cliName}CacheKey`]: 'custom-key'
				});
				await run();
				expect(install.install).toBeCalledWith({
					package: packageName,
					version: '4.2.0',
					packager: 'yarn',
					cache: true,
					cacheKey: 'custom-key',
				});
			});

			it('installs path to global path', async () => {
				install.install.mockResolvedValue(`/${cliName}/install/path`);
				await run();
				expect(core.addPath).toBeCalledWith(`/${cliName}/install/path`);
			});
		});
	});
});

interface MockInputProps {
	expoVersion?: string;
	expoCache?: string;
	expoCacheKey?: string;
	easVersion?: string;
	easCache?: string;
	easCacheKey?: string;
	packager?: string;
	token?: string;
	username?: string;
	password?: string;
	patchWatchers?: string;
}

function mockInput(props: MockInputProps = {}) {
	// fix: kind of dirty workaround for missing "mock 'value' based on arguments"
	const input = (name: string) => {
		switch (name) {
			case 'expo-version':
				return props.expoVersion || '';
			case 'expo-cache':
				return props.expoCache || '';
			case 'expo-cache-key':
				return props.expoCacheKey || '';
			case 'eas-version':
				return props.easVersion || '';
			case 'eas-cache':
				return props.easCache || '';
			case 'eas-cache-key':
				return props.easCacheKey || '';
			case 'packager':
				return props.packager || '';
			case 'token':
				return props.token || '';
			case 'username':
				return props.username || '';
			case 'password':
				return props.password || '';
			case 'patch-watchers':
				return props.patchWatchers || '';
			default:
				return '';
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	core.getInput = input as any;
}
