const core = { debug: jest.fn(), warning: jest.fn() };
const cli = { exec: jest.fn() };

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => cli);

import * as system from '../src/system';
import { setPlatform, resetPlatform } from './utils';

describe('patchWatchers', () => {
	afterEach(() => {
		resetPlatform();
	});

	it('increses fs inotify settings with sysctl', async () => {
		setPlatform('linux');
		await system.patchWatchers();
		expect(cli.exec).toHaveBeenCalledWith('sudo sysctl fs.inotify.max_user_instances=524288');
		expect(cli.exec).toHaveBeenCalledWith('sudo sysctl fs.inotify.max_user_watches=524288');
		expect(cli.exec).toHaveBeenCalledWith('sudo sysctl fs.inotify.max_queued_events=524288');
		expect(cli.exec).toHaveBeenCalledWith('sudo sysctl -p');
	});

	it('warns for unsuccessful patches', async () => {
		const error = new Error('Something went wrong');
		cli.exec.mockRejectedValue(error);
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
		expect(cli.exec).not.toHaveBeenCalled();
	});

	it('skips on macos platform', async () => {
		setPlatform('darwin');
		await system.patchWatchers();
		expect(cli.exec).not.toHaveBeenCalled();
	});

	it('runs on linux platform', async () => {
		setPlatform('linux');
		await system.patchWatchers();
		expect(cli.exec).toHaveBeenCalled();
	});
});
