import { info, exportVariable } from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import { ok as assert } from 'assert';
import { URL } from 'url';

export type CliName = 'expo' | 'eas';

export type Command = {
  cli: CliName;
  args: string[];
  raw: string;
  command: string;
};

export interface ProjectInfo {
  name: string;
  slug: string;
  owner?: string;
}

const CommandRegExp = /^#(eas|expo)\s+(.+)?$/;

export function parseCommand(input: string) {
  const matches = CommandRegExp.exec(input);
  if (matches != null) {
    return {
      cli: matches[1] as CliName,
      raw: input.substring(1).trim(),
      args:
        matches[2]
          ?.split(' ')
          .map(s => s.trim())
          .filter(Boolean) ?? [],
    } as Command;
  }

  return null;
}

/**
 * Try to authenticate the user using either Expo or EAS CLI.
 * This method tries to invoke 'whoami' to validate if the token is valid.
 * If that passes, the token is exported as EXPO_TOKEN for all steps within the job.
 */
export async function authenticate(token: string, cli: CliName = 'expo'): Promise<void> {
  if (!cli) {
    info(`Skipped token validation: no CLI installed, can't run 'whoami'.`);
  } else {
    await exec(await which(cli), ['whoami'], {
      env: { ...process.env, EXPO_TOKEN: token },
    });
  }

  exportVariable('EXPO_TOKEN', token);
}

/**
 * Try to resolve the project owner, by running 'eas|expo whoami'.
 */
export async function projectOwner(cli: CliName = 'expo'): Promise<string> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput(await which(cli), ['whoami'], { silent: true }));
  } catch (error) {
    throw new Error(`Could not fetch the project owner, reason:\n${error.message | error}`);
  }

  if (!stdout) {
    throw new Error(`Could not fetch the project owner, not authenticated`);
  } else if (stdout.endsWith(' (robot)')) {
    throw new Error(`Could not fetch the project owner, used robot account`);
  }

  return stdout.trim();
}

export async function runCommand(cmd: Command) {
  let stdout = '';
  let stderr = '';

  try {
    ({ stderr, stdout } = await getExecOutput(await which(cmd.cli), cmd.args.concat('--non-interactive'), {
      silent: false,
    }));
  } catch (error) {
    throw new Error(`Could not run command ${cmd.args.join(' ')}, reason:\n${error.message | error}`);
  }

  return [stdout.trim(), stderr.trim()];
}

/**
 * Try to resolve the project info, by running 'expo config --type prebuild'.
 */
export async function projectInfo(dir: string): Promise<ProjectInfo> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput(await which('expo', true), ['config', '--json', '--type', 'prebuild'], {
      cwd: dir,
      silent: true,
    }));
  } catch (error) {
    throw new Error(`Could not fetch the project info from ${dir}, reason:\n${error.message || error}`);
  }

  const { name, slug, owner } = JSON.parse(stdout);
  return { name, slug, owner };
}

/**
 * Create a QR code for an update on project, with an optional release channel.
 */
export function projectQR(project: ProjectInfo, channel?: string): string {
  assert(project.owner, 'Could not create a QR code for project without owner');

  const url = new URL('https://qr.expo.dev/expo-go');
  url.searchParams.append('owner', project.owner);
  url.searchParams.append('slug', project.slug);
  if (channel) {
    url.searchParams.append('releaseChannel', channel);
  }

  return url.toString();
}

/**
 * Create a link for the project in Expo.
 */
export function projectLink(project: ProjectInfo, channel?: string): string {
  assert(project.owner, 'Could not create a QR code for project without owner');

  const url = new URL(`https://expo.dev/@${project.owner}/${project.slug}`);
  if (channel) {
    url.searchParams.append('release-channel', channel);
  }

  return url.toString();
}

/**
 * Create a deep link to open the project in Expo Go
 */
export function projectDeepLink(project: ProjectInfo, channel?: string): string {
  assert(project.owner, 'Could not create a deep link for project without owner');

  const url = new URL(`exp://exp.host/@${project.owner}/${project.slug}`);
  if (channel) {
    url.searchParams.append('release-channel', channel);
  }

  return url.toString();
}
