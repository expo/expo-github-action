import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as system from '../src/system';
import { setPlatform, resetPlatform } from './utils';

describe('patchWatchers', () => {
	const spy = {
		info: jest.spyOn(core, 'info').mockImplementation(),
		warning: jest.spyOn(core, 'warning').mockImplementation(),
		exec: jest.spyOn(cli, 'exec').mockImplementation(),
	};

	afterEach(() => {
		resetPlatform();
	});

	it('increses fs inotify settings with sysctl', async () => {
		setPlatform('linux');
		await system.patchWatchers();
		expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_instances=524288');
		expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_user_watches=524288');
		expect(spy.exec).toBeCalledWith('sudo sysctl fs.inotify.max_queued_events=524288');
		expect(spy.exec).toBeCalledWith('sudo sysctl -p');
	});

	it('warns for unsuccessful patches', async () => {
		const error = new Error('Something went wrong');
		spy.exec.mockRejectedValueOnce(error);
		setPlatform('linux');
		await system.patchWatchers();
		expect(core.warning).toBeCalledWith(expect.stringContaining('can\'t patch watchers'));
		expect(core.warning).toBeCalledWith(
			expect.stringContaining('https://github.com/expo/expo-github-action/issues/20')
		);
	});

	it('skips on windows platform', async () => {
		setPlatform('win32');
		await system.patchWatchers();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping'));
		expect(spy.exec).not.toHaveBeenCalled();
	});

	it('skips on macos platform', async () => {
		setPlatform('darwin');
		await system.patchWatchers();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Skipping'));
		expect(spy.exec).not.toHaveBeenCalled();
	});

	it('runs on linux platform', async () => {
		setPlatform('linux');
		await system.patchWatchers();
		expect(spy.info).toBeCalledWith(expect.stringContaining('Patching'));
		expect(spy.exec).toHaveBeenCalled();
	});
});
