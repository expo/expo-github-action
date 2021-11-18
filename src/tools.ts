import * as core from '@actions/core';
import * as cli from '@actions/exec';
import * as io from '@actions/io';
import semver from 'semver';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const registry = require('libnpm');

export type PackageName = 'expo-cli' | 'eas-cli';

export type AuthenticateOptions = {
  cli?: PackageName;
  token?: string;
  username?: string;
  password?: string;
};

/**
 * Convert `expo-cli` or `eas-cli` to just their binary name.
 * For windows we have to use `<bin>.cmd`, toolkit will handle the Windows binary with that.
 */
export function getBinaryName(name: PackageName, forWindows = false): string {
  const bin = name.toLowerCase().replace('-cli', '');
  return forWindows ? `${bin}.cmd` : bin;
}

/**
 * Resolve the provided semver to exact version of `expo-cli`.
 * This uses the npm registry and accepts latest, dist-tags or version ranges.
 * It's used to determine the cached version of `expo-cli`.
 */
export async function resolveVersion(name: PackageName, version: string): Promise<string> {
  return (await registry.manifest(`${name}@${version}`)).version;
}

/**
 * Authenticate with Expo using either the token or username/password method.
 * If both of them are set, token has priority.
 */
export async function maybeAuthenticate(options: AuthenticateOptions = {}): Promise<void> {
  if (options.token) {
    if (options.cli) {
      const bin = getBinaryName(options.cli, process.platform === 'win32');
      await cli.exec(bin, ['whoami'], {
        env: { ...process.env, EXPO_TOKEN: options.token },
      });
    } else {
      core.info("Skipping token validation: no CLI installed, can't run `whoami`.");
    }

    return core.exportVariable('EXPO_TOKEN', options.token);
  }

  if (options.username || options.password) {
    if (options.cli !== 'expo-cli') {
      return core.warning(
        'Skipping authentication: only Expo CLI supports programmatic credentials, use `token` instead.'
      );
    }

    if (!options.username || !options.password) {
      return core.info('Skipping authentication: `username` and/or `password` not set...');
    }

    const bin = getBinaryName(options.cli, process.platform === 'win32');
    await cli.exec(bin, ['login', `--username=${options.username}`], {
      env: { ...process.env, EXPO_CLI_PASSWORD: options.password },
    });
  }

  core.info('Skipping authentication: `token`, `username`, and/or `password` not set...');
}

/**
 * Try to patch the default watcher/inotify limit.
 * This is a limitation from GitHub Actions and might be an issue in some Expo projects.
 * It sets the system's `fs.inotify` limits to a more sensible setting.
 *
 * @see https://github.com/expo/expo-github-action/issues/20
 */
export async function maybePatchWatchers(): Promise<void> {
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

/**
 * Check if there is a new major version available.
 * If there is, create a warning for people to upgrade their workflow.
 * Because this introduces additional requests, it should only be executed when necessary.
 */
export async function maybeWarnForUpdate(name: PackageName): Promise<void> {
  const binaryName = getBinaryName(name);
  const latest = await resolveVersion(name, 'latest');
  const current = await resolveVersion(name, core.getInput(`${getBinaryName(name)}-version`) || 'latest');

  if (semver.diff(latest, current) === 'major') {
    core.warning(`There is a new major version available of the Expo CLI (${latest})`);
    core.warning(
      `If you run into issues, try upgrading your workflow to "${binaryName}-version: ${semver.major(latest)}.x"`
    );
  }
}

/**
 * Handle errors when this action fails, providing useful next-steps for developers.
 * This mostly checks if the installed version is the latest version.
 */
export async function handleError(name: PackageName, error: Error) {
  try {
    await maybeWarnForUpdate(name);
  } catch {
    // If this fails, ignore it
  }

  core.setFailed(error);
}

/**
 * Auto-execute the action if it's not running in a test environment.
 * This is useful to test the action, without running it in tests.
 * The method can also be mocked.
 */
export function performAction(action: () => Promise<void>) {
  if (process.env.JEST_WORKER_ID) {
    return Promise.resolve(null);
  }

  return action();
}

/**
 * Validate if the CLI is installed.
 * If it's not, this will throw a helpful error message.
 */
export async function assertInstalled(name: PackageName): Promise<void> {
  try {
    await io.which(getBinaryName(name, process.platform === 'win32'), true);
  } catch {
    throw new Error(`Could not find ${name}. Make sure you set up ${name} before running this step.`);
  }
}
