import { debug } from '@actions/core';
import { ExpoConfig } from '@expo/config';

import { EasUpdate, getUpdateGroupQr, getUpdateGroupWebsite } from './eas';
import { projectAppType } from './expo';

/**
 * Generate useful variables for the message body, and as step outputs from a set of updates.
 */
export function getTemplateVariablesForUpdates(
  config: ExpoConfig,
  updates: EasUpdate[],
  options: { qrTarget?: 'expo-go' | 'dev-build' | 'dev-client'; workingDirectory: string }
) {
  const projectId: string = config.extra?.eas?.projectId;
  const android = updates.find(update => update.platform === 'android');
  const ios = updates.find(update => update.platform === 'ios');

  const appSchemes = getSchemesInOrderFromConfig(config) || [];
  const appSlug = config.slug;
  const qrTarget = getQrTarget(options);

  return {
    // EAS / Expo specific
    projectId,
    projectName: config.name,
    projectSlug: appSlug,
    projectScheme: appSchemes[0] || '', // This is the longest scheme from one or more custom app schemes
    projectSchemes: JSON.stringify(appSchemes), // These are all custom app schemes, in order from longest to shortest as JSON

    // Shared update properties
    // Note, only use these properties when the update groups are identical
    groupId: updates[0].group,
    runtimeVersion: updates[0].runtimeVersion,
    qr: getUpdateGroupQr({ projectId, updateGroupId: updates[0].group, appSlug, qrTarget }),
    link: getUpdateGroupWebsite({ projectId, updateGroupId: updates[0].group }),

    // These are safe to access regardless of the update groups
    branchName: updates[0].branch,
    message: updates[0].message,
    createdAt: updates[0].createdAt,
    gitCommitHash: updates[0].gitCommitHash,

    // Android update
    androidId: android?.id || '',
    androidGroupId: android?.group || '',
    androidBranchName: android?.branch || '',
    androidManifestPermalink: android?.manifestPermalink || '',
    androidMessage: android?.message || '',
    androidRuntimeVersion: android?.runtimeVersion || '',
    androidQR: android ? getUpdateGroupQr({ projectId, updateGroupId: android.group, appSlug, qrTarget }) : '',
    androidLink: android ? getUpdateGroupWebsite({ projectId, updateGroupId: android.group }) : '',

    // iOS update
    iosId: ios?.id || '',
    iosGroupId: ios?.group || '',
    iosBranchName: ios?.branch || '',
    iosManifestPermalink: ios?.manifestPermalink || '',
    iosMessage: ios?.message || '',
    iosRuntimeVersion: ios?.runtimeVersion || '',
    iosQR: ios ? getUpdateGroupQr({ projectId, updateGroupId: ios.group, appSlug, qrTarget }) : '',
    iosLink: ios ? getUpdateGroupWebsite({ projectId, updateGroupId: ios.group }) : '',
  };
}

type Prefix = 'updates' | 'builds';

type MappedProperties<TObj, TPrefix extends Prefix> = {
  [Property in keyof TObj as `${TPrefix}.${string & Property}`]: TObj[Property];
};

export function prefixKeys<T extends object, TPrefix extends Prefix>(
  input: T,
  prefix: TPrefix
): MappedProperties<T, TPrefix> {
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [prefix + k, v])) as MappedProperties<T, TPrefix>;
}

export function getQrTarget(input: { qrTarget?: 'expo-go' | 'dev-build' | 'dev-client'; workingDirectory: string }) {
  if (!input.qrTarget) {
    const appType = projectAppType(input.workingDirectory);
    debug(`Using inferred QR code target: "${appType}"`);
    return appType;
  }

  switch (input.qrTarget) {
    // Note, `dev-build` is prefered, but `dev-client` is supported to aovid confusion
    case 'dev-client':
    case 'dev-build':
      debug(`Using QR code target: "dev-build"`);
      return 'dev-build';

    case 'expo-go':
      debug(`Using QR code target: "expo-go"`);
      return 'expo-go';

    default:
      throw new Error(`Invalid QR code target: "${input.qrTarget}", expected "expo-go" or "dev-build"`);
  }
}

/**
 * Retrieve the app schemes, in correct priority order, from project config.
 *   - If the scheme is a string, return `[scheme]`.
 *   - If the scheme is an array, return the schemes sorted by length, longest first.
 *   - If the scheme is empty/incorrect, return an empty array.
 */
export function getSchemesInOrderFromConfig(config: ExpoConfig) {
  if (typeof config.scheme === 'string') {
    return [config.scheme];
  }

  if (Array.isArray(config.scheme)) {
    return config.scheme.sort((a, b) => b.length - a.length);
  }

  return [];
}

export function createDetails({
  summary,
  details,
  delim = '\n',
}: {
  summary: string;
  details: string;
  delim?: string;
}): string {
  return `<details><summary>${summary}</summary>${delim.repeat(2)}${details}${delim}</details>`;
}
