import { debug } from '@actions/core';
import { ExpoConfig } from '@expo/config';

import { projectAppType } from './expo';

export function getQrTarget(input: {
  qrTarget?: 'expo-go' | 'dev-build' | 'dev-client';
  workingDirectory: string;
}) {
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
      throw new Error(
        `Invalid QR code target: "${input.qrTarget}", expected "expo-go" or "dev-build"`
      );
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
