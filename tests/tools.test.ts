const registry = { manifest: jest.fn() };
jest.mock('libnpm', () => registry);

import * as core from '@actions/core';
import * as cli from '@actions/exec';

import * as tools from '../src/tools';
import * as utils from './utils';

describe('resolveVersion', () => {
	it('fetches exact version of expo-cli', async () => {
		registry.manifest.mockResolvedValue({ version: '3.0.10' });
		expect(await tools.resolveVersion('latest')).toBe('3.0.10');
		expect(registry.manifest).toBeCalledWith('expo-cli@latest');
	});
});

describe('maybeAuthenticate', () => {
	const token = 'ABC123';
	const username = 'bycedric';
	const password = 'mypassword';

	describe('with token', () => {
		let spy: { [key: string]: jest.SpyInstance } = {};

		beforeEach(() => {
			spy = {
				exportVariable: jest.spyOn(core, 'exportVariable').mockImplementation(),
				exec: jest.spyOn(cli, 'exec').mockImplementation(),
				info: jest.spyOn(core, 'info').mockImplementation(),
			};
		});

		afterAll(() => {
			spy.exportVariable.mockRestore();
			spy.exec.mockRestore();
			spy.info.mockRestore();
		});

		it('skips authentication without token', async () => {
			await tools.maybeAuthenticate();
			expect(spy.exec).not.toBeCalled();
			expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
		});

		it('executes whoami command with token through environment', async () => {
			utils.setEnv('TEST_INCLUDED', 'hellyeah');
			await tools.maybeAuthenticate({ token });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][1]).toStrictEqual(['whoami']);
			expect(spy.exec.mock.calls[0][2]).toMatchObject({
				env: {
					TEST_INCLUDED: 'hellyeah',
					EXPO_TOKEN: token,
				},
			});
			utils.restoreEnv();
		});

		it('fails when token is incorrect', async () => {
			const error = new Error('Not logged in');
			spy.exec.mockRejectedValue(error);
			await expect(tools.maybeAuthenticate({ token })).rejects.toBe(error);
		});

		it('executes whoami command with `expo` on macos', async () => {
			utils.setPlatform('darwin');
			await tools.maybeAuthenticate({ token });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][0]).toBe('expo');
			utils.restorePlatform();
		});

		it('executes whoami command with `expo` on ubuntu', async () => {
			utils.setPlatform('linux');
			await tools.maybeAuthenticate({ token });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][0]).toBe('expo');
			utils.restorePlatform();
		});

		it('executes whoami command with `expo.cmd` on windows', async () => {
			utils.setPlatform('win32');
			await tools.maybeAuthenticate({ token });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
			utils.restorePlatform();
		});
	});

	describe('credentials', () => {
		let spy: { [key: string]: jest.SpyInstance } = {};

		beforeEach(() => {
			spy = {
				exec: jest.spyOn(cli, 'exec').mockImplementation(),
				info: jest.spyOn(core, 'info').mockImplementation(),
			};
		});

		afterAll(() => {
			spy.exec.mockRestore();
			spy.info.mockRestore();
		});

		it('skips authentication without credentials', async () => {
			await tools.maybeAuthenticate();
			expect(spy.exec).not.toBeCalled();
			expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
		});

		it('skips authentication without password', async () => {
			await tools.maybeAuthenticate({ username });
			expect(spy.exec).not.toBeCalled();
			expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping authentication'));
		});

		it('executes login command with password through environment', async () => {
			utils.setEnv('TEST_INCLUDED', 'hellyeah');
			await tools.maybeAuthenticate({ username, password })
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][1]).toStrictEqual(['login', `--username=${username}`]);
			expect(spy.exec.mock.calls[0][2]).toMatchObject({
				env: {
					TEST_INCLUDED: 'hellyeah',
					EXPO_CLI_PASSWORD: password,
				},
			});
			utils.restoreEnv();
		});

		it('fails when credentials are incorrect', async () => {
			const error = new Error('Invalid username/password. Please try again.');
			spy.exec.mockRejectedValue(error);
			await expect(tools.maybeAuthenticate({ username, password }))
				.rejects
				.toBe(error);
		});

		it('executes login command with `expo` on macos', async () => {
			utils.setPlatform('darwin');
			await tools.maybeAuthenticate({ username, password });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][0]).toBe('expo');
			utils.restorePlatform();
		});

		it('executes login command with `expo` on ubuntu', async () => {
			utils.setPlatform('linux');
			await tools.maybeAuthenticate({ username, password });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][0]).toBe('expo');
			utils.restorePlatform();
		});

		it('executes login command with `expo.cmd` on windows', async () => {
			utils.setPlatform('win32');
			await tools.maybeAuthenticate({ username, password });
			expect(spy.exec).toBeCalled();
			expect(spy.exec.mock.calls[0][0]).toBe('expo.cmd');
			utils.restorePlatform();
		});
	});
});

describe('maybePatchWatchers', () => {
	let spy: { [key: string]: jest.SpyInstance } = {};

	beforeEach(() => {
		spy = {
			info: jest.spyOn(core, 'info').mockImplementation(),
			warning: jest.spyOn(core, 'warning').mockImplementation(),
			exec: jest.spyOn(cli, 'exec').mockImplementation(),
		};
	});

	afterEach(() => {
		utils.restorePlatform();
	});

	afterAll(() => {
		spy.info.mockRestore();
		spy.warning.mockRestore();
		spy.exec.mockRestore();
	});

	it('increses fs inotify settings with sysctl', async () => {
		utils.setPlatform('linux');
		await tools.maybePatchWatchers();
		expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_instances=524288');
		expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_watches=524288');
		expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_queued_events=524288');
		expect(spy.exec).toBeCalledWith('sudo sysctl -p');
	});

	it('warns for unsuccessful patches', async () => {
		const error = new Error('Something went wrong');
		spy.exec.mockRejectedValueOnce(error);
		utils.setPlatform('linux');
		await tools.maybePatchWatchers();
		expect(core.warning).toBeCalledWith(expect.stringContaining("can't patch watchers"));
		expect(core.warning).toBeCalledWith(
			expect.stringContaining('https://github.com/expo/expo-github-action/issues/20')
		);
	});

	it('skips on windows platform', async () => {
		utils.setPlatform('win32');
		await tools.maybePatchWatchers();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping'));
		expect(spy.exec).not.toHaveBeenCalled();
	});

	it('skips on macos platform', async () => {
		utils.setPlatform('darwin');
		await tools.maybePatchWatchers();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping'));
		expect(spy.exec).not.toHaveBeenCalled();
	});

	it('runs on linux platform', async () => {
		utils.setPlatform('linux');
		await tools.maybePatchWatchers();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Patching'));
		expect(spy.exec).toHaveBeenCalled();
	});
});

describe('maybeWarnForUpdate', () => {
	let spy: { [key: string]: jest.SpyInstance } = {};

	beforeEach(() => {
		spy = { warning: jest.spyOn(core, 'warning').mockImplementation() };
	});

	afterAll(() => {
		spy.warning.mockRestore();
	});

	it('is silent when major version is up to date', async () => {
		registry.manifest
			.mockResolvedValueOnce({ version: '4.1.0' })
			.mockResolvedValueOnce({ version: '4.0.1'});
		await tools.maybeWarnForUpdate();
		expect(spy.warning).not.toBeCalled();
	})

	it('warns when major version is outdated', async () => {
		registry.manifest
			.mockResolvedValueOnce({ version: '4.1.0' })
			.mockResolvedValueOnce({ version: '3.0.1'});
		await tools.maybeWarnForUpdate();
		expect(spy.warning).toBeCalledWith('There is a new major version available of the Expo CLI (4.1.0)');
		expect(spy.warning).toBeCalledWith('If you run into issues, try upgrading your workflow to "expo-version: 4.x"');
	})
});
