import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import { ExpoConfig } from '@expo/config';

import { errorMessage } from './utils';

/**
 * Load the Expo app project config in the given directory.
 * This runs `expo config` command instead of using `@expo/config` directly,
 * to use the app's own version of the config.
 */
export async function loadProjectConfig(cwd: string): Promise<ExpoConfig> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput(await which('expo', true), ['config', '--json', '--type', 'public'], {
      cwd,
      silent: true,
    }));
  } catch (error) {
    throw new Error(`Could not fetch the project info from ${cwd}, reason:\n${errorMessage(error)}`);
  }

  return JSON.parse(stdout);
}
