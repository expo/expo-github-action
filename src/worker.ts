import { addPath, debug, info, setFailed, warning } from '@actions/core';
import { exec } from '@actions/exec';
import { ok as assert } from 'assert';
import os from 'os';
import path from 'path';

export { find as findTool, cacheDir as cacheTool } from '@actions/tool-cache';

/**
 * Auto-execute the action and pass errors to 'core.setFailed'.
 * It also passes the full error, with stacktrace, to 'core.debug'.
 * You'll need to enable debugging to view these full errors.
 *
 * @see https://github.com/actions/toolkit/blob/main/docs/action-debugging.md#step-debug-logs
 */
export function executeAction(action: () => Promise<void>) {
  return action().catch((error: Error) => {
    setFailed(error.message || error);
    debug(error.stack || 'No stacktrace available');
  });
}

/**
 * Install a "tool" from a node package.
 * This will add the folder, containing the `node_modules`, to the global path.
 */
export function installToolFromPackage(dir: string) {
  return addPath(path.join(dir, 'node_modules', '.bin'));
}

/**
 * Try to patch Linux's inotify limits to a more sensible setting on Linux.
 * This limitation could cause `ENOSPC` errors when bundling Expo or React Native projects.
 *
 * It will try to change these `fs.inotify.` limits:
 *   - .max_user_instances = 524288
 *   - .max_user_watches = 524288
 *   - .max_queued_events = 524288
 *
 * @see https://github.com/expo/expo-github-action/issues/20
 */
export async function patchWatchers(): Promise<void> {
  if (process.platform !== 'linux') {
    return info('Skipped patching watchers: not running on Linux.');
  }

  try {
    // see https://github.com/expo/expo-cli/issues/277#issuecomment-452685177
    await exec('sudo sysctl fs.inotify.max_user_instances=524288');
    await exec('sudo sysctl fs.inotify.max_user_watches=524288');
    await exec('sudo sysctl fs.inotify.max_queued_events=524288');
    await exec('sudo sysctl -p');
    info('Patched system watchers for the `ENOSPC` error.');
  } catch (error) {
    warning(`Looks like we can't patch watchers/inotify limits, you might encouter the 'ENOSPC' error.`);
    warning('For more info: https://github.com/expo/expo-github-action/issues/20, encountered error:');
    warning(error.message);
  }
}

export function tempPath(name: string, version: string): string {
  assert(process.env['RUNNER_TEMP'], 'Could not resolve temporary path, RUNNER_TEMP not defined');
  return path.join(process.env['RUNNER_TEMP'], name, version, os.arch());
}

/**
 * Get the package path to the tool cache.
 *
 * @see https://github.com/actions/toolkit/blob/daf8bb00606d37ee2431d9b1596b88513dcf9c59/packages/tool-cache/src/tool-cache.ts#L747-L749
 */
export function toolPath(name: string, version: string): string {
  assert(process.env['RUNNER_TOOL_CACHE'], 'Could not resolve the local tool cache, RUNNER_TOOL_CACHE not defined');
  return path.join(process.env['RUNNER_TOOL_CACHE'], name, version, os.arch());
}
