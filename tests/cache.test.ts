import os from 'os';
import { join } from 'path';
import * as remoteCache from '@actions/cache/lib';
import * as toolCache from '@actions/tool-cache';
import * as cache from '../src/cache';
import * as utils from './utils';

describe('fromLocalCache', () => {
	it('fetches the version specific cache', async () => {
		const path = join('path', 'to', 'local', 'cache');
		// todo: check why jest wants `never` instead of `string`
		const find = jest.spyOn(toolCache, 'find').mockResolvedValue(path as never);
		const result = await cache.fromLocalCache('3.20.1');
		expect(result).toBe(path);
		expect(find).toBeCalledWith('expo-cli', '3.20.1');
	});
});

describe('toLocalCache', () => {
	it('stores the version specific cache', async () => {
		const path = join('path', 'to', 'local', 'cache');
		const root = join('path', 'from', 'source');
		const cacheDir = jest.spyOn(toolCache, 'cacheDir').mockResolvedValue(path);
		const result = await cache.toLocalCache(root, '3.20.1');
		expect(result).toBe(path);
		expect(cacheDir).toBeCalledWith(root, 'expo-cli', '3.20.1');
	});
});

describe('fromRemoteCache', () => {
	const spy = {
		restore: jest.spyOn(remoteCache, 'restoreCache').mockImplementation(),
	};

	beforeAll(() => {
		utils.setEnv('RUNNER_TOOL_CACHE', join('cache', 'path'));
	});

	afterAll(() => {
		utils.restoreEnv();
	});

	it('restores remote cache with default key', async () => {
		expect(await cache.fromRemoteCache('3.20.1', 'yarn')).toBeUndefined();
		expect(remoteCache.restoreCache).toBeCalledWith(
			join('cache', 'path', 'expo-cli', '3.20.1', os.arch()),
			`expo-cli-${process.platform}-${os.arch()}-yarn-3.20.1`,
			`expo-cli-${process.platform}-${os.arch()}-yarn-3.20.1`,
		);
	});

	it('restores remote cache with custom key', async () => {
		expect(await cache.fromRemoteCache('3.20.0', 'yarn', 'custom-cache-key')).toBeUndefined();
		expect(remoteCache.restoreCache).toBeCalledWith(
			join('cache', 'path', 'expo-cli', '3.20.0', os.arch()),
			'custom-cache-key',
			'custom-cache-key',
		);
	});

	it('returns path when remote cache exists', async () => {
		spy.restore.mockResolvedValueOnce(true);
		await expect(cache.fromRemoteCache('3.20.1', 'npm')).resolves.toBe(
			join('cache', 'path', 'expo-cli', '3.20.1', os.arch()),
		);
	});

	it('fails when remote cache throws', async () => {
		const error = new Error('Remote cache restore failed');
		spy.restore.mockRejectedValueOnce(error);
		await expect(cache.fromRemoteCache('3.20.1', 'yarn')).rejects.toBe(error);
	});
});

describe('toRemoteCache', () => {
	const spy = {
		save: jest.spyOn(remoteCache, 'saveCache').mockImplementation(),
	};

	it('saves remote cache with default key', async () => {
		expect(await cache.toRemoteCache(join('local', 'path'), '3.20.1', 'npm')).toBeUndefined();
		expect(remoteCache.saveCache).toBeCalledWith(
			join('local', 'path'),
			`expo-cli-${process.platform}-${os.arch()}-npm-3.20.1`,
		);
	});

	it('saves remote cache with custom key', async () => {
		expect(await cache.toRemoteCache(join('local', 'path'), '3.20.1', 'yarn', 'custom-cache-key')).toBeUndefined();
		expect(remoteCache.saveCache).toBeCalledWith(join('local', 'path'), 'custom-cache-key');
	});

	it('fails when remote cache throws', async () => {
		const error = new Error('Remote cache save failed');
		spy.save.mockRejectedValueOnce(error);
		await expect(cache.toRemoteCache(join('local', 'path'), '3.20.1', 'yarn')).rejects.toBe(error);
	});
});
