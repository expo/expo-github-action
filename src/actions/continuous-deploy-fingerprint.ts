import { getInput, info, setFailed, setOutput } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { which } from '@actions/io';

import { createDetails, getTemplateVariablesForUpdates } from '../comment';
import { EasUpdate } from '../eas';
import { BuildInfo, appPlatformEmojis, getBuildLogsUrl } from '../expo';
import { createIssueComment, hasPullContext, pullContext } from '../github';
import { loadProjectConfig } from '../project';
import { template } from '../utils';
import { executeAction } from '../worker';

export const MESSAGE_ID = 'continuous-deploy-fingerprint-projectId:{projectId}';

export function collectContinuousDeployFingerprintInput() {
  return {
    profile: getInput('profile'),
    branch: getInput('branch'),
    githubToken: getInput('github-token'),
    workingDirectory: getInput('working-directory'),
    commentId: getInput('comment-id') || MESSAGE_ID,
  };
}

executeAction(continuousDeployFingerprintAction);

export async function continuousDeployFingerprintAction(input = collectContinuousDeployFingerprintInput()) {
  const config = await loadProjectConfig(input.workingDirectory);
  if (!config.extra?.eas?.projectId) {
    return setFailed(`Missing 'extra.eas.projectId' in app.json or app.config.js.`);
  }

  const androidFingerprintHash = await getFingerprintHashForPlatformAsync({
    cwd: input.workingDirectory,
    platform: 'android',
  });
  const iosFingerprintHash = await getFingerprintHashForPlatformAsync({ cwd: input.workingDirectory, platform: 'ios' });

  info(`Android fingerprint: ${androidFingerprintHash}`);
  info(`iOS fingerprint: ${iosFingerprintHash}`);

  let androidBuildInfo = await getBuildInfoWithFingerprintAsync({
    cwd: input.workingDirectory,
    platform: 'android',
    profile: input.profile,
    fingerprintHash: androidFingerprintHash,
  });
  if (androidBuildInfo) {
    info(`Existing Android build found for fingerprint: ${androidBuildInfo.id}`);
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
  });
  if (iosBuildInfo) {
    info(`Existing iOS build found for fingerprint: ${iosBuildInfo.id}`);
  } else {
    info(`No existing iOS build found for fingerprint, starting a new build...`);
    iosBuildInfo = await createEASBuildAsync({ cwd: input.workingDirectory, platform: 'ios', profile: input.profile });
  }

  const builds = [androidBuildInfo, iosBuildInfo];

  info(`Publishing EAS Update`);

  const updates = await publishEASUpdatesAsync({
    cwd: input.workingDirectory,
    branch: input.branch,
  });

  if (!hasPullContext()) {
    info(`Skipped comment: action was not run from a pull request`);
  } else {
    const updatesVariables = getTemplateVariablesForUpdates(config, updates, input);
    const messageId = template(input.commentId, updatesVariables);
    const messageBody = createSummaryForUpdatesAndBuilds(updates, builds, updatesVariables);

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
    const { stdout } = await getExecOutput('npx', ['expo-updates', 'fingerprint:generate', '--platform', platform], {
      cwd,
    });
    const { hash } = JSON.parse(stdout);
    if (!hash || typeof hash !== 'string') {
      throw new Error(`Invalid fingerprint output: ${stdout}`);
    }
    return hash;
  } catch (error: unknown) {
    throw new Error(`Could not get fingerprint for project`, { cause: error });
  }
}

async function getBuildInfoWithFingerprintAsync({
  cwd,
  platform,
  profile,
  fingerprintHash,
}: {
  cwd: string;
  platform: 'ios' | 'android';
  profile: string;
  fingerprintHash: string;
}): Promise<BuildInfo | null> {
  let stdout;
  try {
    const execOutput = await getExecOutput(
      await which('eas', true),
      [
        'build:list',
        '--platform',
        platform,
        '--status',
        'finished',
        '--profile',
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
        silent: true,
      }
    );
    stdout = execOutput.stdout;
  } catch (error: unknown) {
    throw new Error(`Could not list project builds`, { cause: error });
  }

  const builds = JSON.parse(stdout);
  if (!builds || !Array.isArray(builds)) {
    throw new Error(`Could not get EAS builds for project`);
  }

  if (!builds[0]) {
    return null;
  }

  return builds[0];
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
  let stdout;
  try {
    const execOutput = await getExecOutput(
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
        '--build-logger-level',
        'debug',
      ],
      {
        cwd,
      }
    );
    stdout = execOutput.stdout;
  } catch (error: unknown) {
    throw new Error(`Could not run command eas build`, { cause: error });
  }

  return JSON.parse(stdout);
}

async function publishEASUpdatesAsync({ cwd, branch }: { cwd: string; branch: string }): Promise<EasUpdate[]> {
  let stdout = '';

  try {
    ({ stdout } = await getExecOutput(
      await which('eas', true),
      ['update', '--auto', '--branch', branch, '--non-interactive'],
      {
        cwd,
      }
    ));
  } catch (error: unknown) {
    throw new Error(`Could not create a new EAS Update`, { cause: error });
  }

  return JSON.parse(stdout);
}

function createSummaryForUpdatesAndBuilds(
  updates: EasUpdate[],
  builds: BuildInfo[],
  updatesVariables: ReturnType<typeof getTemplateVariablesForUpdates>
) {
  return [
    createSummaryForBuilds(builds),
    '',
    createMultipleQrSummaryForUpdates(updates, updatesVariables),
    `> Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/continuous-deploy-fingerprint)`,
  ].join('\n');
}

async function createSummaryForBuilds(builds: BuildInfo[]) {
  const tableRows: string[] = [];
  for (const build of builds) {
    let name;
    if (build.platform === 'ANDROID') {
      name = `${appPlatformEmojis.ANDROID} Android build`;
    } else if (build.platform === 'IOS') {
      name = `${appPlatformEmojis.IOS} iOS build`;
    } else {
      name = 'Unknown build';
    }

    const buildPageURL = getBuildLogsUrl(build);
    const details = createDetails({
      summary: 'Details',
      details: [
        `Distribution: \`${build.distribution}\``,
        `Build profile: \`${build.buildProfile}\``,
        `Runtime version: \`${build.runtimeVersion}\``,
        `App version: \`${build.appVersion}\``,
      ].join('<br>'),
      delim: '',
    });

    tableRows.push(`| ${name} | [View build page](${buildPageURL}) | ${details} |`);
  }

  return ['| Name | Build | Details |', '| :-- | :-- | :-- |', ...tableRows].join('\n');
}

function createMultipleQrSummaryForUpdates(
  updates: EasUpdate[],
  vars: ReturnType<typeof getTemplateVariablesForUpdates>
) {
  const createTableHeader = (segments: string[]) => segments.filter(Boolean).join(' <br /> ');

  const androidHeader = createTableHeader([
    'Android',
    vars.androidId && vars.androidRuntimeVersion ? `_(${vars.androidRuntimeVersion})_` : '',
    vars.androidId && vars.androidLink ? `**[More info](${vars.androidLink})**` : '',
  ]);

  const androidQr =
    vars.androidId && vars.androidQR
      ? `<a href="${vars.androidQR}"><img src="${vars.androidQR}" width="250px" height="250px" /></a>`
      : null;

  const iosHeader = createTableHeader([
    'iOS',
    vars.iosId && vars.iosRuntimeVersion ? `_(${vars.iosRuntimeVersion})_` : '',
    vars.iosId && vars.iosLink ? `**[More info](${vars.iosLink})**` : '',
  ]);

  const iosQr =
    vars.iosId && vars.iosQR
      ? `<a href="${vars.iosQR}"><img src="${vars.iosQR}" width="250px" height="250px" /></a>`
      : null;

  return `${createSummaryHeaderForUpdates(updates, vars)}

${androidHeader} | ${iosHeader}
--- | ---
${androidQr || '_not created_'} | ${iosQr || '_not created_'}`;
}

function createSummaryHeaderForUpdates(updates: EasUpdate[], vars: ReturnType<typeof getTemplateVariablesForUpdates>) {
  const platformName = `Platform${updates.length === 1 ? '' : 's'}`;
  const platformValue = updates
    .map(update => update.platform)
    .sort((a, b) => a.localeCompare(b))
    .map(platform => `**${platform}**`)
    .join(', ');

  const appSchemes = vars.projectScheme ? `- Scheme → **${JSON.parse(vars.projectSchemes).join('**, **')}**` : '';

  return `🚀 Expo preview is ready!

- Project → **${vars.projectSlug}**
- ${platformName} → ${platformValue}
${appSchemes}`.trim();
}
