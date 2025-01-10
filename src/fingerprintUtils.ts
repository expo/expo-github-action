import { info, isDebug } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';

import { BuildInfo, BuildStatus } from './expo';

export async function getBuildInfoForCurrentFingerprintAsync({
  platform,
  workingDirectory,
  profile,
  isInPullRequest,
}: {
  platform: 'ios' | 'android';
  profile: string;
  workingDirectory: string;
  isInPullRequest: boolean;
}): Promise<{ buildInfo: BuildInfo | null; fingerprintHash: string }> {
  const humanReadablePlatformName = platform === 'ios' ? 'iOS' : 'Android';

  const fingerprintHash = await getFingerprintHashForPlatformAsync({
    cwd: workingDirectory,
    platform,
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

export async function getFingerprintHashForPlatformAsync({
  cwd,
  platform,
}: {
  cwd: string;
  platform: 'ios' | 'android';
}): Promise<string> {
  try {
    const extraArgs = isDebug() ? ['--debug'] : [];
    const { stdout } = await getExecOutput(
      'npx',
      ['expo-updates', 'fingerprint:generate', '--platform', platform, ...extraArgs],
      {
        cwd,
        silent: !isDebug(),
      }
    );
    const { hash } = JSON.parse(stdout);
    if (!hash || typeof hash !== 'string') {
      throw new Error(`Invalid fingerprint output: ${stdout}`);
    }
    return hash;
  } catch (error: unknown) {
    throw new Error(`Could not get fingerprint for project: ${String(error)}`);
  }
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
  let stdout: string;
  try {
    const execOutput = await getExecOutput(
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
    stdout = execOutput.stdout;
  } catch (error: unknown) {
    throw new Error(`Could not list project builds: ${String(error)}`);
  }

  const builds = JSON.parse(stdout);
  if (!builds || !Array.isArray(builds)) {
    throw new Error(`Could not get EAS builds for project`);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const buildsThatAreValid = (builds as BuildInfo[]).filter(build => {
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
