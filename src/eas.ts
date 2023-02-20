import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import type { Platform } from '@expo/config';
import semver from 'semver';
import { URL } from 'url';

import { errorMessage } from './utils';

export interface EasUpdate {
  /** The unique ID of the platform specific update */
  id: string;
  /** When the update was created */
  createdAt: string;
  /** The unique ID of the update for both platforms */
  group: string;
  /** The branch name where this update was created */
  branch: string;
  /** The message used to describe this update */
  message: string;
  /** The runtime version for which this update is compatible */
  runtimeVersion: string;
  /** Which platform this update belongs to */
  platform: Platform;
  /** The permanent link that refers the platform specific update */
  manifestPermalink: string;
  /** The git commit hash that was recognizable when creating this update */
  gitCommitHash: string;
}

/** We can only run the `preview` sub-action with newer versions of EAS CLI */
export async function assertEasVersion(versionRange: string) {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput(await which('eas', true), ['--version']));
  } catch {
    throw new Error(`Could not verify the EAS CLI version, reason:\nCommand failed 'eas --version'`);
  }

  const version = stdout.match(/eas-cli\/([^\s]+)/i);
  if (!version || !version[1]) {
    throw new Error(`Could not verify the EAS CLI version, reason:\nUnexpected output received.`);
  }

  if (!semver.satisfies(version[1], versionRange)) {
    throw new Error(
      `The EAS CLI version (${version[1]}) is not supported, reason:\nExpected version range: ${versionRange}`
    );
  }
}

/**
 * Create a new EAS Update using the user-provided command.
 * The command should be anything after `eas ...`.
 */
export async function createUpdate(cwd: string, command: string): Promise<EasUpdate[]> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput((await which('eas', true)) + ` ${command}`, undefined, {
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
export function getUpdateGroupQr({
  projectId,
  updateGroupId,
  appScheme,
}: {
  projectId: string;
  updateGroupId: string;
  appScheme?: string;
}): string {
  const url = new URL('https://qr.expo.dev/eas-update');

  if (appScheme) {
    url.searchParams.append('appScheme', appScheme);
  }

  url.searchParams.append('projectId', projectId);
  url.searchParams.append('groupId', updateGroupId);

  return url.toString();
}

/** Create the absolute link to the update group on expo.dev */
export function getUpdateGroupWebsite({
  projectId,
  updateGroupId,
}: {
  projectId: string;
  updateGroupId: string;
}): string {
  return `https://expo.dev/projects/${projectId}/updates/${updateGroupId}`;
}
