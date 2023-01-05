import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import type { Platform } from '@expo/config';
import { URL } from 'url';

import { errorMessage } from './utils';

interface Update {
  id: string;
  group: string;
  runtimeVersion: string;
  platform: Platform;
  manifestPermalink: string;
}

/**
 * Create a new EAS Update using the user-provided command.
 * The command should be anything after `eas ...`.
 */
export async function createUpdate(cwd: string, command: string): Promise<Update[]> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput(await which('eas', true), [command], {
      cwd,
    }));
  } catch (error) {
    throw new Error(`Could not create a new EAS Update, reason:\n${errorMessage(error)}`);
  }

  return JSON.parse(stdout);
}

/**
 * Create a QR code link for an EAS Update.
 */
export function getUpdateQr({
  projectId,
  updateId,
  appScheme = 'exp',
}: {
  projectId: string;
  updateId: string;
  appScheme?: string;
}): string {
  const url = new URL('https://qr.expo.dev/eas-update');

  url.searchParams.append('appScheme', appScheme);
  url.searchParams.append('projectId', projectId);
  url.searchParams.append('updateId', updateId);

  return url.toString();
}
