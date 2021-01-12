const core = {
	addPath: jest.fn(),
	getInput: jest.fn(),
	group: (message: string, action: () => Promise<any>) => action()
};
const exec = { exec: jest.fn() };
const install = { install: jest.fn() };
const tools = {
	resolveVersion: jest.fn(v => v),
	maybeAuthenticate: jest.fn(),
	maybePatchWatchers: jest.fn(),
};

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => exec);
jest.mock('../src/tools', () => tools);
jest.mock('../src/install', () => install);

import { run } from '../src/run';

interface MockInputProps {
	version?: string;
	packager?: string;
	token?: string;
	username?: string;
	password?: string;
	patchWatchers?: string;
	cache?: string;
	cacheKey?: string;
}

const mockInput = (props: MockInputProps = {}) => {
	// fix: kind of dirty workaround for missing "mock 'value' based on arguments"
	const input = (name: string) => {
		switch (name) {
			case 'expo-version':
				return props.version || '';
			case 'expo-packager':
				return props.packager || '';
			case 'expo-token':
				return props.token || '';
			case 'expo-username':
				return props.username || '';
			case 'expo-password':
				return props.password || '';
			case 'expo-patch-watchers':
				return props.patchWatchers || '';
			case 'expo-cache':
				return props.cache || '';
			case 'expo-cache-key':
				return props.cacheKey || '';
			default:
				return '';
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	core.getInput = input as any;
};

describe('run', () => {
	it('installs latest expo-cli with yarn by default', async () => {
		await run();
		expect(install.install).toBeCalledWith({ version: 'latest', packager: 'yarn', cache: false });
	});

	it('installs provided version expo-cli with npm', async () => {
		mockInput({ version: '3.0.10', packager: 'npm' });
		await run();
		expect(install.install).toBeCalledWith({ version: '3.0.10', packager: 'npm', cache: false });
	});

	it('installs path to global path', async () => {
		install.install.mockResolvedValue('/expo/install/path');
		await run();
		expect(core.addPath).toBeCalledWith('/expo/install/path');
	});

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
});
