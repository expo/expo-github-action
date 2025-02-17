import { info, isDebug } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';

import { BuildInfo, BuildStatus } from './expo';

export async function getBuildInfoForCurrentFingerprintAsync({
  platform,
  workingDirectory,
  environment,
  profile,
  isInPullRequest,
}: {
  platform: 'ios' | 'android';
  profile: string;
  workingDirectory: string;
  environment: string | null;
  isInPullRequest: boolean;
}): Promise<{ buildInfo: BuildInfo | null; fingerprintHash: string }> {
  const humanReadablePlatformName = platform === 'ios' ? 'iOS' : 'Android';

  const fingerprintHash = await getFingerprintHashForPlatformAsync({
    cwd: workingDirectory,
    platform,
    environment,
  });

  info(`${humanReadablePlatformName} fingerprint: ${fingerprintHash}`);

  info(
    `Looking for ${humanReadablePlatformName} builds with matching runtime version (fingerprint)...`
  );

  return {
    buildInfo: await getBuildInfoWithFingerprintAsync({
      cwd: workingDirectory,
      platform,
      profile,
      fingerprintHash,
      excludeExpiredBuilds: isInPullRequest,
    }),
    fingerprintHash,
  };
}

async function getFingerprintHashForPlatformAsync({
  cwd,
  platform,
  environment,
}: {
  cwd: string;
  platform: 'ios' | 'android';
  environment: string | null;
}): Promise<string> {
  let hash: string;
  try {
    const extraArgs = isDebug() ? ['--debug'] : [];

    const baseArguments = [
      'expo-updates',
      'fingerprint:generate',
      '--platform',
      platform,
      ...extraArgs,
    ];

    let commandLine: string;
    let args: string[];
    if (environment) {
      commandLine = await which('eas', true);
      const commandToExecute = ['npx', ...baseArguments].join(' ').replace(/"/g, '\\"');
      args = ['env:exec', '--non-interactive', environment, `"${commandToExecute}"`];
    } else {
      commandLine = 'npx';
      args = baseArguments;
    }

    const { stdout } = await getExecOutput(commandLine, args, {
      cwd,
      silent: !isDebug(),
    });
    hash = JSON.parse(stdout).hash;
  } catch (error: unknown) {
    throw new Error(`Error calculating fingerprint: ${String(error)}`, { cause: error });
  }
  if (!hash || typeof hash !== 'string') {
    throw new Error(`Invalid fingerprint hash: ${hash}`);
  }
  return hash;
}

export async function getBuildInfoWithFingerprintAsync({
  cwd,
  platform,
  profile,
  fingerprintHash,
  excludeExpiredBuilds,
}: {
  cwd: string;
  platform: 'ios' | 'android';
  profile: string;
  fingerprintHash: string;
  excludeExpiredBuilds: boolean;
}): Promise<BuildInfo | null> {
  let builds: BuildInfo[];
  try {
    const { stdout } = await getExecOutput(
      await which('eas', true),
      [
        'build:list',
        '--platform',
        platform,
        '--buildProfile',
        profile,
        '--runtimeVersion',
        fingerprintHash,
        '--limit',
        '1',
        '--json',
        '--non-interactive',
      ],
      {
        cwd,
        silent: !isDebug(),
      }
    );
    builds = JSON.parse(stdout);
  } catch (error: unknown) {
    throw new Error(`Error getting EAS builds: ${String(error)}`, { cause: error });
  }

  if (!builds || !Array.isArray(builds)) {
    throw new Error(`Could not get EAS builds for project`);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const buildsThatAreValid = builds.filter(build => {
    const isValidStatus = [
      BuildStatus.New,
      BuildStatus.InQueue,
      BuildStatus.InProgress,
      BuildStatus.Finished,
    ].includes(build.status);
    // if the build is expired or will expire within the next day,
    const isValidExpiry = excludeExpiredBuilds ? new Date(build.expirationDate) > tomorrow : true;
    return isValidStatus && isValidExpiry;
  });

  return buildsThatAreValid[0] ?? null;
}
