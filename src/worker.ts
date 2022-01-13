import { addPath, exportVariable, info, setFailed, warning } from '@actions/core';
import { exec } from '@actions/exec';
import os from 'os';
import path from 'path';

export { find as findTool, cacheDir as cacheTool } from '@actions/tool-cache';

export function tempPath(name: string, version: string): string {
  const temp = process.env['RUNNER_TEMP'] || '';
  if (!temp) {
    throw new Error(`Could not resolve temporary path, 'RUNNER_TEMP' not defined.`);
  }

  return path.join(temp, name, version, os.arch());
}

export function toolPath(name: string, version: string): string {
  const toolCache = process.env['RUNNER_TOOL_CACHE'] || '';
  if (!toolCache) {
    throw new Error(`Could not resolve the local tool cache, 'RUNNER_TOOL_CACHE' not defined.`);
  }

  // https://github.com/actions/toolkit/blob/daf8bb00606d37ee2431d9b1596b88513dcf9c59/packages/tool-cache/src/tool-cache.ts#L747-L749
  return path.join(toolCache, name, version, os.arch());
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

/**
 * Try to authenticate the user using either Expo or EAS CLI.
 * This method tries to invoke 'whoami' to validate if the token is valid.
 * If that passes, the token is exported as EXPO_TOKEN for all steps within the job.
 */
export async function expoAuthenticate(token: string, cli?: 'expo-cli' | 'eas-cli'): Promise<void> {
  if (!cli) {
    info(`Skipped token validation: no CLI installed, can't run 'whoami'.`);
  } else {
    const cliName = process.platform === 'win32' ? `${cli}.cmd` : cli;
    await exec(cliName, ['whoami'], {
      env: { ...process.env, EXPO_TOKEN: token },
    });
  }

  exportVariable('EXPO_TOKEN', token);
}

/**
 * Auto-execute the action if it's not running in a test environment.
 * This also propagate possible errors to GitHub actions, with setFailed.
 */
export async function executeAction(action: () => Promise<void>) {
  if (process.env.JEST_WORKER_ID) {
    return Promise.resolve(null);
  }

  return action().catch(setFailed);
}
