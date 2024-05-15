import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import { ExpoConfig } from '@expo/config';

/**
 * Load the Expo app project config in the given directory.
 * This runs `expo config` command instead of using `@expo/config` directly,
 * to use the app's own version of the config.
 */
export async function loadProjectConfig(cwd: string): Promise<ExpoConfig> {
  let stdout = '';

  try {
    const cmd = await Promise.any([which('bunx'), which('npx')]);
    ({ stdout } = await getExecOutput(cmd, ['expo', 'config', '--json', '--type', 'public'], {
      cwd,
      silent: true,
    }));
  } catch (error: unknown) {
    throw new Error(`Could not fetch the project info from ${cwd}`, { cause: error });
  }

  return JSON.parse(stdout);
}
