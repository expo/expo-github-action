import { isDebug } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import { ExpoConfig } from '@expo/config';

/**
 * Load the Expo app project config in the given directory.
 * This runs `expo config` command instead of using `@expo/config` directly,
 * to use the app's own version of the config.
 */
export async function loadProjectConfig(
  cwd: string,
  easEnvironment: string | null
): Promise<ExpoConfig> {
  let stdout = '';

  const baseArguments = ['expo', 'config', '--json', '--type', 'public'];

  let commandLine: string;
  let args: string[];
  if (easEnvironment) {
    commandLine = await which('eas', true);
    const commandToExecute = ['npx', ...baseArguments].join(' ').replace(/"/g, '\\"');
    args = ['env:exec', '--non-interactive', easEnvironment, `"${commandToExecute}"`];
  } else {
    commandLine = 'npx';
    args = baseArguments;
  }

  try {
    ({ stdout } = await getExecOutput(commandLine, args, {
      cwd,
      silent: !isDebug(),
    }));
  } catch (error: unknown) {
    throw new Error(`Could not fetch the project info from ${cwd}`, { cause: error });
  }

  return JSON.parse(stdout);
}
