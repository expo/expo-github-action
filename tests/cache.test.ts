import os from 'os';
import { join } from 'path';
import * as remoteCache from '@actions/cache';
import * as core from '@actions/core';
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
	let spy: { [key: string]: jest.SpyInstance } = {};

	beforeEach(() => {
		spy = {
			restore: jest.spyOn(remoteCache, 'restoreCache').mockImplementation(),
			warning: jest.spyOn(core, 'warning').mockImplementation(),
		};
	});

	beforeAll(() => {
		utils.setEnv('RUNNER_TOOL_CACHE', join('cache', 'path'));
	});

	afterAll(() => {
		utils.restoreEnv();
		spy.restore.mockRestore();
		spy.warning.mockRestore();
	});

	it('restores remote cache with default key', async () => {
		expect(await cache.fromRemoteCache('3.20.1', 'yarn')).toBeUndefined();
		expect(remoteCache.restoreCache).toBeCalledWith(
			[join('cache', 'path', 'expo-cli', '3.20.1', os.arch())],
			`expo-cli-${process.platform}-${os.arch()}-yarn-3.20.1`,
		);
	});

	it('restores remote cache with custom key', async () => {
		expect(await cache.fromRemoteCache('3.20.0', 'yarn', 'custom-cache-key')).toBeUndefined();
		expect(remoteCache.restoreCache).toBeCalledWith(
			[join('cache', 'path', 'expo-cli', '3.20.0', os.arch())],
			'custom-cache-key',
		);
	});

	it('returns path when remote cache exists', async () => {
		spy.restore.mockResolvedValueOnce(true);
		await expect(cache.fromRemoteCache('3.20.1', 'npm')).resolves.toBe(
			join('cache', 'path', 'expo-cli', '3.20.1', os.arch())
		);
	});

	it('fails when remote cache throws', async () => {
		const error = new Error('Remote cache restore failed');
		spy.restore.mockRejectedValueOnce(error);
		await expect(cache.fromRemoteCache('3.20.1', 'yarn')).rejects.toBe(error);
	});

	it('skips remote cache when unavailable', async () => {
		// see: https://github.com/actions/toolkit/blob/9167ce1f3a32ad495fc1dbcb574c03c0e013ae53/packages/cache/src/internal/cacheHttpClient.ts#L41
		const error = new Error('Cache Service Url not found, unable to restore cache.');
		spy.restore.mockRejectedValueOnce(error);
		await expect(cache.fromRemoteCache('3.20.1', 'yarn')).resolves.toBeUndefined();
		expect(spy.warning).toHaveBeenCalledWith(expect.stringContaining('Skipping remote cache'));
	});
});

describe('toRemoteCache', () => {
	let spy: { [key: string]: jest.SpyInstance } = {};

	beforeEach(() => {
		spy = {
			save: jest.spyOn(remoteCache, 'saveCache').mockImplementation(),
			warning: jest.spyOn(core, 'warning').mockImplementation(),
		};
	});

	afterAll(() => {
		spy.save.mockRestore();
		spy.warning.mockRestore();
	});

	it('saves remote cache with default key', async () => {
		expect(await cache.toRemoteCache(join('local', 'path'), '3.20.1', 'npm')).toBeUndefined();
		expect(remoteCache.saveCache).toBeCalledWith(
			[join('local', 'path')],
			`expo-cli-${process.platform}-${os.arch()}-npm-3.20.1`
		);
	});

	it('saves remote cache with custom key', async () => {
		expect(await cache.toRemoteCache(join('local', 'path'), '3.20.1', 'yarn', 'custom-cache-key')).toBeUndefined();
		expect(remoteCache.saveCache).toBeCalledWith([join('local', 'path')], 'custom-cache-key');
	});

	it('fails when remote cache throws', async () => {
		const error = new Error('Remote cache save failed');
		spy.save.mockRejectedValueOnce(error);
		await expect(cache.toRemoteCache(join('local', 'path'), '3.20.1', 'yarn')).rejects.toBe(error);
	});

	it('skips remote cache when unavailable', async () => {
		// see: https://github.com/actions/toolkit/blob/9167ce1f3a32ad495fc1dbcb574c03c0e013ae53/packages/cache/src/internal/cacheHttpClient.ts#L41
		const error = new Error('Cache Service Url not found, unable to restore cache.');
		spy.save.mockRejectedValueOnce(error);
		await expect(cache.toRemoteCache(join('local', 'path'), '3.20.1', 'yarn')).resolves.toBeUndefined();
		expect(spy.warning).toHaveBeenCalledWith(expect.stringContaining('Skipping remote cache'));
	});
});
