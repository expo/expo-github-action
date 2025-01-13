import { info, isDebug, setFailed, setOutput } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';
import { ExpoConfig } from '@expo/config';

import { createDetails, getQrTarget, getSchemesInOrderFromConfig } from '../comment';
import { EasUpdate, getUpdateGroupQr, getUpdateGroupWebsite } from '../eas';
import { AppPlatform, BuildInfo, appPlatformEmojis, getBuildLogsUrl } from '../expo';
import { getBuildInfoForCurrentFingerprintAsync } from '../fingerprintUtils';
import { createIssueComment, hasPullContext, pullContext } from '../github';
import { getInput } from '../input';
import { loadProjectConfig } from '../project';
import { executeAction } from '../worker';

type BuildRunInfo = { buildInfo: BuildInfo; isNew: boolean; fingerprintHash: string };
type PlatformArg = 'android' | 'ios' | 'all';

export function collectContinuousDeployFingerprintInput() {
  function validatePlatformInput(platformInput: string): platformInput is PlatformArg {
    return ['android', 'ios', 'all'].includes(platformInput);
  }

  const platformInput = getInput('platform', { required: true });
  if (!validatePlatformInput(platformInput)) {
    throw new Error(`Invalid platform: ${platformInput}. Must be one of "all", "ios", "android".`);
  }

  return {
    profile: getInput('profile', { required: true }),
    branch: getInput('branch', { required: true }),
    platform: platformInput,
    environment: getInput('environment'),
    autoSubmitBuilds: getInput('auto-submit-builds') === 'true',
    githubToken: getInput('github-token', { required: true }),
    workingDirectory: getInput('working-directory', { required: true }),
  };
}

executeAction(continuousDeployFingerprintAction);

export async function continuousDeployFingerprintAction(
  input = collectContinuousDeployFingerprintInput()
) {
  const isInPullRequest = hasPullContext();

  const config = await loadProjectConfig(input.workingDirectory, input.environment);
  const projectId = config.extra?.eas?.projectId;
  if (!projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const platformsToRun: Set<PlatformArg> =
    input.platform === 'all' ? new Set(['ios', 'android']) : new Set([input.platform]);

  const [androidBuildRunInfo, iosBuildRunInfo] = await Promise.all([
    platformsToRun.has('android')
      ? buildForPlatformIfNecessaryAsync({
          platform: 'android',
          profile: input.profile,
          workingDirectory: input.workingDirectory,
          isInPullRequest,
          environment: input.environment,
          autoSubmitBuild: input.autoSubmitBuilds,
        })
      : null,
    platformsToRun.has('ios')
      ? buildForPlatformIfNecessaryAsync({
          platform: 'ios',
          profile: input.profile,
          workingDirectory: input.workingDirectory,
          isInPullRequest,
          environment: input.environment,
          autoSubmitBuild: input.autoSubmitBuilds,
        })
      : null,
  ]);

  info(`Publishing EAS Update...`);

  const updates = await publishEASUpdatesAsync({
    cwd: input.workingDirectory,
    branch: input.branch,
    platform: input.platform,
    environment: input.environment,
  });

  if (!isInPullRequest) {
    info(`Skipped comment: action was not run from a pull request`);
  } else {
    const messageId = `continuous-deploy-fingerprint-projectId:${projectId}`;
    const messageBody = createSummaryForUpdatesAndBuilds({
      config,
      projectId,
      updates,
      buildRunInfos: {
        androidBuildRunInfo: androidBuildRunInfo ?? undefined,
        iosBuildRunInfo: iosBuildRunInfo ?? undefined,
      },
      options: input,
    });

    await createIssueComment({
      ...pullContext(),
      token: input.githubToken,
      id: messageId,
      body: messageBody,
    });
  }

  setOutput('android-fingerprint', androidBuildRunInfo?.fingerprintHash);
  setOutput('ios-fingerprint', iosBuildRunInfo?.fingerprintHash);
  setOutput('android-build-id', androidBuildRunInfo?.buildInfo.id);
  setOutput('android-did-start-new-build', androidBuildRunInfo?.isNew);
  setOutput('ios-build-id', iosBuildRunInfo?.buildInfo?.id);
  setOutput('ios-did-start-new-build', iosBuildRunInfo?.isNew);

  setOutput('update-output', updates);
}

async function buildForPlatformIfNecessaryAsync({
  platform,
  workingDirectory,
  profile,
  isInPullRequest,
  environment,
  autoSubmitBuild,
}: {
  platform: 'ios' | 'android';
  profile: string;
  workingDirectory: string;
  isInPullRequest: boolean;
  environment: string | null;
  autoSubmitBuild: boolean;
}): Promise<BuildRunInfo> {
  const humanReadablePlatformName = platform === 'ios' ? 'iOS' : 'Android';

  const { buildInfo: existingBuildInfo, fingerprintHash } =
    await getBuildInfoForCurrentFingerprintAsync({
      workingDirectory,
      platform,
      profile,
      isInPullRequest,
      environment,
    });
  if (existingBuildInfo) {
    info(
      `Existing ${humanReadablePlatformName} build found with matching fingerprint: ${existingBuildInfo.id}`
    );
    return {
      buildInfo: existingBuildInfo,
      isNew: false,
      fingerprintHash,
    };
  } else {
    info(
      `No existing ${humanReadablePlatformName} build found for fingerprint, starting a new build...`
    );
    return {
      buildInfo: await createEASBuildAsync({
        cwd: workingDirectory,
        platform,
        profile,
        autoSubmit: autoSubmitBuild,
      }),
      isNew: true,
      fingerprintHash,
    };
  }
}

async function createEASBuildAsync({
  cwd,
  profile,
  platform,
  autoSubmit,
}: {
  cwd: string;
  profile: string;
  platform: 'ios' | 'android';
  autoSubmit: boolean;
}): Promise<BuildInfo> {
  try {
    const extraDebugArgs = isDebug() ? ['--build-logger-level', 'debug'] : [];
    const extraAutoSubmitArgs = autoSubmit ? ['--auto-submit'] : [];
    const { stdout } = await getExecOutput(
      await which('eas', true),
      [
        'build',
        '--profile',
        profile,
        '--platform',
        platform,
        '--non-interactive',
        '--json',
        '--no-wait',
        ...extraDebugArgs,
        ...extraAutoSubmitArgs,
      ],
      {
        cwd,
        silent: !isDebug(),
      }
    );
    return JSON.parse(stdout)[0];
  } catch (error: unknown) {
    throw new Error(`Error running eas build command: ${String(error)}`, { cause: error });
  }
}

async function publishEASUpdatesAsync({
  cwd,
  branch,
  environment,
  platform,
}: {
  cwd: string;
  branch: string;
  environment: string | null;
  platform: PlatformArg;
}): Promise<EasUpdate[]> {
  let stdout: string;
  try {
    const args = [
      'update',
      '--auto',
      '--branch',
      branch,
      '--platform',
      platform,
      '--non-interactive',
      '--json',
    ];
    if (environment) {
      args.push('--environment', environment);
    }
    const execOutput = await getExecOutput(await which('eas', true), args, {
      cwd,
      silent: !isDebug(),
    });
    stdout = execOutput.stdout;
  } catch (error: unknown) {
    throw new Error(`Error running eas update command: ${String(error)}`, { cause: error });
  }

  return JSON.parse(stdout);
}

function createSummaryForUpdatesAndBuilds({
  config,
  projectId,
  updates,
  buildRunInfos,
  options,
}: {
  config: ExpoConfig;
  projectId: string;
  updates: EasUpdate[];
  buildRunInfos: { androidBuildRunInfo?: BuildRunInfo; iosBuildRunInfo?: BuildRunInfo };
  options: { qrTarget?: 'expo-go' | 'dev-build' | 'dev-client'; workingDirectory: string };
}) {
  const appSlug = config.slug;
  const qrTarget = getQrTarget(options);
  const appSchemes = getSchemesInOrderFromConfig(config) || [];

  const { androidBuildRunInfo, iosBuildRunInfo } = buildRunInfos;

  const androidUpdate = updates.find(update => update.platform === 'android');
  const iosUpdate = updates.find(update => update.platform === 'ios');

  const getBuildLink = (build: BuildInfo | undefined) =>
    build ? `[Build Permalink](${getBuildLogsUrl(build)})` : 'n/a';
  const getUpdateLink = (update: EasUpdate | undefined) =>
    update
      ? `[Update Permalink](${getUpdateGroupWebsite({ projectId, updateGroupId: update.group })})`
      : 'n/a';
  const getUpdateQRURL = (update: EasUpdate | undefined) =>
    update ? getUpdateGroupQr({ projectId, updateGroupId: update.group, appSlug, qrTarget }) : null;
  const getBuildDetails = (buildRunInfo: BuildRunInfo) =>
    getBuildLink(buildRunInfo.buildInfo) +
    '<br />' +
    createDetails({
      summary: 'Details',
      details: [
        `Distribution: \`${buildRunInfo.buildInfo.distribution}\``,
        `Build profile: \`${buildRunInfo.buildInfo.buildProfile}\``,
        `Runtime version: \`${buildRunInfo.buildInfo.runtimeVersion}\``,
        `App version: \`${buildRunInfo.buildInfo.appVersion}\``,
        `Git commit: \`${buildRunInfo.buildInfo.gitCommitHash}\``,
      ].join('<br />'),
      delim: '',
    });
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

  const iosQr = iosQRURL
    ? `<a href="${iosQRURL}"><img src="${iosQRURL}" width="250px" height="250px" /></a>`
    : null;

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

&nbsp; | ${appPlatformEmojis[AppPlatform.Android]} Android | ${
    appPlatformEmojis[AppPlatform.Ios]
  } iOS
--- | --- | ---
Fingerprint | ${androidBuildRunInfo?.buildInfo.runtimeVersion ?? 'n/a'} | ${
    iosBuildRunInfo?.buildInfo.runtimeVersion ?? 'n/a'
  }
Build Details | ${androidBuildRunInfo ? getBuildDetails(androidBuildRunInfo) : 'n/a'} | ${
    iosBuildRunInfo ? getBuildDetails(iosBuildRunInfo) : 'n/a'
  }
Update Details | ${getUpdateDetails(androidUpdate)} | ${getUpdateDetails(iosUpdate)}
Update QR   | ${androidQr ?? 'n/a'} | ${iosQr ?? 'n/a'}
`;
}
