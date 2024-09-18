import { getInput, info, isDebug, setFailed, setOutput } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import { ExpoConfig } from '@expo/config';

import { createDetails, getQrTarget, getSchemesInOrderFromConfig } from '../comment';
import { EasUpdate, getUpdateGroupQr, getUpdateGroupWebsite } from '../eas';
import { AppPlatform, BuildInfo, BuildStatus, appPlatformEmojis, getBuildLogsUrl } from '../expo';
import { createIssueComment, hasPullContext, pullContext } from '../github';
import { loadProjectConfig } from '../project';
import { executeAction } from '../worker';

export function collectContinuousDeployFingerprintInput() {
  return {
    profile: getInput('profile'),
    branch: getInput('branch'),
    githubToken: getInput('github-token'),
    workingDirectory: getInput('working-directory'),
  };
}

executeAction(continuousDeployFingerprintAction);

export async function continuousDeployFingerprintAction(input = collectContinuousDeployFingerprintInput()) {
  const isInPullRequest = hasPullContext();

  const config = await loadProjectConfig(input.workingDirectory);
  const projectId = config.extra?.eas?.projectId;
  if (!projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const androidFingerprintHash = await getFingerprintHashForPlatformAsync({
    cwd: input.workingDirectory,
    platform: 'android',
  });
  const iosFingerprintHash = await getFingerprintHashForPlatformAsync({ cwd: input.workingDirectory, platform: 'ios' });

  info(`Android fingerprint: ${androidFingerprintHash}`);
  info(`iOS fingerprint: ${iosFingerprintHash}`);

  info('Looking for builds with matching runtime version (fingerprint)...');

  let androidBuildInfo = await getBuildInfoWithFingerprintAsync({
    cwd: input.workingDirectory,
    platform: 'android',
    profile: input.profile,
    fingerprintHash: androidFingerprintHash,
    excludeExpiredBuilds: isInPullRequest,
  });
  if (androidBuildInfo) {
    info(`Existing Android build found with matching fingerprint: ${androidBuildInfo.id}`);
  } else {
    info(`No existing Android build found for fingerprint, starting a new build...`);
    androidBuildInfo = await createEASBuildAsync({
      cwd: input.workingDirectory,
      platform: 'android',
      profile: input.profile,
    });
  }

  let iosBuildInfo = await getBuildInfoWithFingerprintAsync({
    cwd: input.workingDirectory,
    platform: 'ios',
    profile: input.profile,
    fingerprintHash: iosFingerprintHash,
    excludeExpiredBuilds: isInPullRequest,
  });
  if (iosBuildInfo) {
    info(`Existing iOS build found with matching fingerprint: ${iosBuildInfo.id}`);
  } else {
    info(`No existing iOS build found for fingerprint, starting a new build...`);
    iosBuildInfo = await createEASBuildAsync({ cwd: input.workingDirectory, platform: 'ios', profile: input.profile });
  }

  const builds = [androidBuildInfo, iosBuildInfo];

  info(`Publishing EAS Update...`);

  const updates = await publishEASUpdatesAsync({
    cwd: input.workingDirectory,
    branch: input.branch,
  });

  if (!isInPullRequest) {
    info(`Skipped comment: action was not run from a pull request`);
  } else {
    const messageId = `continuous-deploy-fingerprint-projectId:${projectId}`;
    const messageBody = createSummaryForUpdatesAndBuilds({ config, projectId, updates, builds, options: input });

    await createIssueComment({
      ...pullContext(),
      token: input.githubToken,
      id: messageId,
      body: messageBody,
    });
  }

  setOutput('android-fingerprint', androidFingerprintHash);
  setOutput('ios-fingerprint', iosFingerprintHash);
  setOutput('android-build-id', androidBuildInfo.id);
  setOutput('ios-build-id', iosBuildInfo.id);
  setOutput('update-output', updates);
}

async function getFingerprintHashForPlatformAsync({
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

async function getBuildInfoWithFingerprintAsync({
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
    const isValidStatus = [BuildStatus.New, BuildStatus.InQueue, BuildStatus.InProgress, BuildStatus.Finished].includes(
      build.status
    );
    // if the build is expired or will expire within the next day,
    const isValidExpiry = excludeExpiredBuilds ? new Date(build.expirationDate) > tomorrow : true;
    return isValidStatus && isValidExpiry;
  });

  return buildsThatAreValid[0] ?? null;
}

async function createEASBuildAsync({
  cwd,
  profile,
  platform,
}: {
  cwd: string;
  profile: string;
  platform: 'ios' | 'android';
}): Promise<BuildInfo> {
  let stdout: string;
  try {
    const extraArgs = isDebug() ? ['--build-logger-level', 'debug'] : [];
    const execOutput = await getExecOutput(
      await which('eas', true),
      ['build', '--profile', profile, '--platform', platform, '--non-interactive', '--json', '--no-wait', ...extraArgs],
      {
        cwd,
        silent: !isDebug(),
      }
    );
    stdout = execOutput.stdout;
  } catch (error: unknown) {
    throw new Error(`Could not run command eas build: ${String(error)}`);
  }

  return JSON.parse(stdout)[0];
}

async function publishEASUpdatesAsync({ cwd, branch }: { cwd: string; branch: string }): Promise<EasUpdate[]> {
  let stdout: string;
  try {
    const execOutput = await getExecOutput(
      await which('eas', true),
      ['update', '--auto', '--branch', branch, '--non-interactive', '--json'],
      {
        cwd,
        silent: !isDebug(),
      }
    );
    stdout = execOutput.stdout;
  } catch (error: unknown) {
    throw new Error(`Could not create a new EAS Update: ${String(error)}`);
  }

  return JSON.parse(stdout);
}

function createSummaryForUpdatesAndBuilds({
  config,
  projectId,
  updates,
  builds,
  options,
}: {
  config: ExpoConfig;
  projectId: string;
  updates: EasUpdate[];
  builds: BuildInfo[];
  options: { qrTarget?: 'expo-go' | 'dev-build' | 'dev-client'; workingDirectory: string };
}) {
  const appSlug = config.slug;
  const qrTarget = getQrTarget(options);
  const appSchemes = getSchemesInOrderFromConfig(config) || [];

  const androidBuild = builds.find(build => build.platform === AppPlatform.Android);
  const iosBuild = builds.find(build => build.platform === AppPlatform.Ios);

  const androidUpdate = updates.find(update => update.platform === 'android');
  const iosUpdate = updates.find(update => update.platform === 'ios');

  const getBuildLink = (build: BuildInfo | undefined) =>
    build ? `[Build Permalink](${getBuildLogsUrl(build)})` : 'n/a';
  const getUpdateLink = (update: EasUpdate | undefined) =>
    update ? `[Update Permalink](${getUpdateGroupWebsite({ projectId, updateGroupId: update.group })})` : 'n/a';
  const getUpdateQRURL = (update: EasUpdate | undefined) =>
    update ? getUpdateGroupQr({ projectId, updateGroupId: update.group, appSlug, qrTarget }) : null;
  const getBuildDetails = (build: BuildInfo | undefined) =>
    build
      ? getBuildLink(build) +
        '<br />' +
        createDetails({
          summary: 'Details',
          details: [
            `Distribution: \`${build.distribution}\``,
            `Build profile: \`${build.buildProfile}\``,
            `Runtime version: \`${build.runtimeVersion}\``,
            `App version: \`${build.appVersion}\``,
            `Git commit: \`${build.gitCommitHash}\``,
          ].join('<br />'),
          delim: '',
        })
      : 'n/a';
  const getUpdateDetails = (update: EasUpdate | undefined) =>
    update
      ? getUpdateLink(update) +
        '<br />' +
        createDetails({
          summary: 'Details',
          details: [
            `Branch: \`${update.branch}\``,
            `Runtime version: \`${update.runtimeVersion}\``,
            `Git commit: \`${update.gitCommitHash}\``,
          ].join('<br />'),
          delim: '',
        })
      : 'n/a';

  const androidQRURL = getUpdateQRURL(androidUpdate);
  const iosQRURL = getUpdateQRURL(iosUpdate);

  const androidQr = androidQRURL
    ? `<a href="${androidQRURL}"><img src="${androidQRURL}" width="250px" height="250px" /></a>`
    : null;

  const iosQr = iosQRURL ? `<a href="${iosQRURL}"><img src="${iosQRURL}" width="250px" height="250px" /></a>` : null;

  const platformName = `Platform${updates.length === 1 ? '' : 's'}`;
  const platformValue = updates
    .map(update => update.platform)
    .sort((a, b) => a.localeCompare(b))
    .map(platform => `**${platform}**`)
    .join(', ');

  const schemesMessage = appSchemes[0] ? `- Scheme → **${appSchemes.join('**, **')}**` : '';

  return `🚀 Expo continuous deployment is ready!

- Project → **${appSlug}**
- ${platformName} → ${platformValue}
${schemesMessage}

&nbsp; | ${appPlatformEmojis[AppPlatform.Android]} Android | ${appPlatformEmojis[AppPlatform.Ios]} iOS
--- | --- | ---
Fingerprint | ${androidBuild?.runtimeVersion ?? 'n/a'} | ${iosBuild?.runtimeVersion ?? 'n/a'}
Build Details | ${getBuildDetails(androidBuild)} | ${getBuildDetails(iosBuild)}
Update Details | ${getUpdateDetails(androidUpdate)} | ${getUpdateDetails(iosUpdate)}
Update QR   | ${androidQr ?? 'n/a'} | ${iosQr ?? 'n/a'}
`;
}
