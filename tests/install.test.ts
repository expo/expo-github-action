const cli = { exec: jest.fn() };
const io = { mkdirP: jest.fn(), which: jest.fn() };
const cache = {
	fromLocalCache: jest.fn(),
	fromRemoteCache: jest.fn(),
	toLocalCache: jest.fn(),
	toRemoteCache: jest.fn(),
};

jest.mock('@actions/exec', () => cli);
jest.mock('@actions/io', () => io);
jest.mock('../src/cache', () => cache);

import { join } from 'path';

import * as install from '../src/install';
import * as utils from './utils';

describe('install', () => {
	it('installs path from local cache', async () => {
		cache.fromLocalCache.mockResolvedValue(join('cache', 'path'));
		const expoPath = await install.install({ version: '3.0.10', packager: 'npm' });
		expect(expoPath).toBe(join('cache', 'path', 'node_modules', '.bin'));
	});

	it('installs path from packager and cache it locally', async () => {
		utils.setEnv('RUNNER_TEMP', join('temp', 'path'));
		cache.fromLocalCache.mockResolvedValue(undefined);
		cache.toLocalCache.mockResolvedValue(join('cache', 'path'));
		const expoPath = await install.install({ version: '3.0.10', packager: 'npm' });
		expect(expoPath).toBe(join('cache', 'path', 'node_modules', '.bin'));
		expect(cache.toLocalCache).toBeCalledWith(join('temp', 'path'), '3.0.10');
		utils.restoreEnv();
	});

	it('installs path from remote cache', async () => {
		cache.fromLocalCache.mockResolvedValue(undefined);
		cache.fromRemoteCache.mockResolvedValue(join('cache', 'path'));
		const expoPath = await install.install({ version: '3.20.1', packager: 'npm', cache: true });
		expect(expoPath).toBe(join('cache', 'path', 'node_modules', '.bin'));
		expect(cache.fromRemoteCache).toBeCalledWith('3.20.1', 'npm', undefined);
	});

	it('installs path from packager and cache it remotely', async () => {
		utils.setEnv('RUNNER_TEMP', join('temp', 'path'));
		cache.fromLocalCache.mockResolvedValue(undefined);
		cache.fromRemoteCache.mockResolvedValue(undefined);
		cache.toLocalCache.mockResolvedValue(join('cache', 'path'));
		const expoPath = await install.install({ version: '3.20.1', packager: 'npm', cache: true });
		expect(expoPath).toBe(join('cache', 'path', 'node_modules', '.bin'));
		expect(cache.toRemoteCache).toBeCalledWith(join('cache', 'path'), '3.20.1', 'npm', undefined);
		utils.restoreEnv();
	});
});

describe('fromPackager', () => {
	it('resolves tool path', async () => {
		await install.fromPackager('3.0.10', 'npm');
		expect(io.which).toBeCalledWith('npm');
	});

	it('creates temporary folder', async () => {
		utils.setEnv('RUNNER_TEMP', join('temp', 'path'));
		await install.fromPackager('latest', 'yarn');
		expect(io.mkdirP).toBeCalledWith(join('temp', 'path'));
		utils.restoreEnv();
	});

	it('installs expo with tool', async () => {
		utils.setEnv('RUNNER_TEMP', join('temp', 'path'));
		io.which.mockResolvedValue('npm');
		const expoPath = await install.fromPackager('beta', 'npm');
		expect(expoPath).toBe(join('temp', 'path'));
		expect(cli.exec).toBeCalled();
		expect(cli.exec.mock.calls[0][0]).toBe('npm');
		expect(cli.exec.mock.calls[0][1]).toStrictEqual(['add', 'expo-cli@beta']);
		expect(cli.exec.mock.calls[0][2]).toMatchObject({ cwd: join('temp', 'path') });
		utils.restoreEnv();
	});
});
