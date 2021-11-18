import { getConfig } from '@expo/config';

export type AppLinks = {
  url: string;
  manifest: string;
};

/**
 * Get the full name of the Expo app.
 * This executes `expo config --type public` to determine the app owner and name.
 */
export function getAppFullName(projectRoot: string): string {
  const { exp: app } = getConfig(projectRoot, {
    skipPlugins: true,
    skipSDKVersionRequirement: true,
    isPublicConfig: true,
  });

  if (!app.currentFullName) {
    throw new Error(
      `Can't resolve the app name and owner. If you use a robot, make sure to add 'owner' in your app manifest.`
    );
  }

  return app.currentFullName;
}

/**
 * Get the Expo app links, either url or direct manifest reference.
 */
export function getAppLinks(fullName: string, releaseChannel?: string): AppLinks {
  let app = `${fullName}`;
  if (releaseChannel) {
    app += `release-channel=${releaseChannel}`;
  }

  return {
    url: `https://expo.dev/${app}`,
    manifest: `exp://exp.host/${app}`,
  };
}
