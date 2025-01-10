import { setFailed, setOutput } from '@actions/core';

import { getBuildInfoForCurrentFingerprintAsync } from '../fingerprintUtils';
import { getInput } from '../input';
import { loadProjectConfig } from '../project';
import { executeAction } from '../worker';

type PlatformArg = 'android' | 'ios' | 'all';

export function collectContinousDeployFingerprintInfoInput() {
  function validatePlatformInput(platformInput: string): platformInput is PlatformArg {
    return ['android', 'ios', 'all'].includes(platformInput);
  }

  const platformInput = getInput('platform', { required: true });
  if (!validatePlatformInput(platformInput)) {
    throw new Error(`Invalid platform: ${platformInput}. Must be one of "all", "ios", "android".`);
  }

  return {
    profile: getInput('profile', { required: true }),
    platform: platformInput,
    environment: getInput('environment'),
    githubToken: getInput('github-token', { required: true }),
    workingDirectory: getInput('working-directory', { required: true }),
  };
}

executeAction(continousDeployFingerprintInfoAction);

export async function continousDeployFingerprintInfoAction(
  input = collectContinousDeployFingerprintInfoInput()
) {
  const config = await loadProjectConfig(input.workingDirectory, input.environment);
  const projectId = config.extra?.eas?.projectId;
  if (!projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const platformsToRun: Set<PlatformArg> =
    input.platform === 'all' ? new Set(['ios', 'android']) : new Set([input.platform]);

  const [androidBuildInfo, iosBuildInfo] = await Promise.all([
    platformsToRun.has('android')
      ? getBuildInfoForCurrentFingerprintAsync({
          platform: 'android',
          profile: input.profile,
          workingDirectory: input.workingDirectory,
          isInPullRequest: false,
          environment: input.environment,
        })
      : null,
    platformsToRun.has('ios')
      ? getBuildInfoForCurrentFingerprintAsync({
          platform: 'ios',
          profile: input.profile,
          workingDirectory: input.workingDirectory,
          isInPullRequest: false,
          environment: input.environment,
        })
      : null,
  ]);

  setOutput('android-fingerprint', androidBuildInfo?.fingerprintHash);
  setOutput('ios-fingerprint', iosBuildInfo?.fingerprintHash);
  setOutput('android-build-id', androidBuildInfo?.buildInfo?.id);
  setOutput('ios-build-id', iosBuildInfo?.buildInfo?.id);
}
