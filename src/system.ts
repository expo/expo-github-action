import * as core from '@actions/core';
import * as cli from '@actions/exec';

/**
 * Try to patch the default watcher/inotify limit.
 * This is a limitation from GitHub Actions and might be an issue in some Expo projects.
 * It sets the system's `fs.inotify` limits to a more sensible setting.
 *
 * @see https://github.com/expo/expo-github-action/issues/20
 */
export async function patchWatchers(): Promise<void> {
	if (process.platform !== 'linux') {
		return core.info('Skipping patch for watchers, not running on Linux...');
	}

	core.info('Patching system watchers for the `ENOSPC` error...');

	try {
		// see https://github.com/expo/expo-cli/issues/277#issuecomment-452685177
		await cli.exec('sudo sysctl fs.inotify.max_user_instances=524288');
		await cli.exec('sudo sysctl fs.inotify.max_user_watches=524288');
		await cli.exec('sudo sysctl fs.inotify.max_queued_events=524288');
		await cli.exec('sudo sysctl -p');
	} catch {
		core.warning("Looks like we can't patch watchers/inotify limits, you might encouter the `ENOSPC` error.");
		core.warning('For more info, https://github.com/expo/expo-github-action/issues/20');
	}
}
