import { ExpoConfig } from '@expo/config';

import { createSummary, getVariables, previewInput } from '../../actions/preview';
import { EasUpdate } from '../../eas';

jest.mock('../../expo');

const fakeOptions = {
  qrTarget: 'dev-client',
} as unknown as ReturnType<typeof previewInput>;

const fakeExpoGoOptions = {
  qrTarget: 'expo-go',
} as unknown as ReturnType<typeof previewInput>;

const fakeExpoConfig = {
  slug: 'fake-project',
  extra: {
    eas: { projectId: 'fake-project-id' },
  },
} as unknown as ExpoConfig;

const fakeUpdatesSingle: EasUpdate[] = [
  {
    id: 'fake-android-id',
    createdAt: '2023-02-04T14:15:20.365Z',
    group: 'fake-group-id',
    branch: 'main',
    message: 'feature: create new update',
    runtimeVersion: 'exposdk:47.0.0',
    platform: 'android',
    manifestPermalink: 'https://u.expo.dev/update/fake-android-id',
    gitCommitHash: 'aabbccdd',
  },
  {
    id: 'fake-ios-id',
    createdAt: '2023-02-04T14:15:20.365Z',
    group: 'fake-group-id',
    branch: 'main',
    message: 'feature: create new update',
    runtimeVersion: 'exposdk:47.0.0',
    platform: 'ios',
    manifestPermalink: 'https://u.expo.dev/update/fake-ios-id',
    gitCommitHash: 'aabbccdd',
  },
];

const fakeUpdatesMultiple = fakeUpdatesSingle.map(update => ({
  ...update,
  group: `fake-group-${update.id}`,
}));

describe(getVariables, () => {
  describe('QR code scheme selection', () => {
    it('uses custom scheme for dev-build QR code when scheme is defined', () => {
      const configWithScheme = {
        ...fakeExpoConfig,
        scheme: ['myappdev', 'myapp'],
      } as unknown as ExpoConfig;

      const variables = getVariables(configWithScheme, fakeUpdatesSingle, fakeOptions);

      // Should use the first (longest) scheme, not the slug
      expect(variables.qr).toContain('appScheme=myappdev');
      expect(variables.qr).not.toContain('appScheme=fake-project');
      expect(variables.androidQR).toContain('appScheme=myappdev');
      expect(variables.iosQR).toContain('appScheme=myappdev');
    });

    it('falls back to slug for dev-build QR code when no scheme is defined', () => {
      const configWithoutScheme = {
        ...fakeExpoConfig,
        scheme: undefined,
      } as unknown as ExpoConfig;

      const variables = getVariables(configWithoutScheme, fakeUpdatesSingle, fakeOptions);

      // Should fallback to slug when no scheme is defined
      expect(variables.qr).toContain('appScheme=fake-project');
      expect(variables.androidQR).toContain('appScheme=fake-project');
      expect(variables.iosQR).toContain('appScheme=fake-project');
    });

    it('falls back to slug for dev-build QR code when scheme array is empty', () => {
      const configWithEmptyScheme = {
        ...fakeExpoConfig,
        scheme: [],
      } as unknown as ExpoConfig;

      const variables = getVariables(configWithEmptyScheme, fakeUpdatesSingle, fakeOptions);

      // Should fallback to slug when scheme array is empty
      expect(variables.qr).toContain('appScheme=fake-project');
    });

    it('does not include appScheme in QR code for expo-go target', () => {
      const configWithScheme = {
        ...fakeExpoConfig,
        scheme: ['myappdev'],
      } as unknown as ExpoConfig;

      const variables = getVariables(configWithScheme, fakeUpdatesSingle, fakeExpoGoOptions);

      // expo-go target should not have appScheme parameter
      expect(variables.qr).not.toContain('appScheme=');
    });

    it('uses single string scheme for dev-build QR code', () => {
      const configWithStringScheme = {
        ...fakeExpoConfig,
        scheme: 'singlescheme',
      } as unknown as ExpoConfig;

      const variables = getVariables(configWithStringScheme, fakeUpdatesSingle, fakeOptions);

      expect(variables.qr).toContain('appScheme=singlescheme');
    });
  });
});

describe(createSummary, () => {
  describe('single update group', () => {
    it('returns expected message for both platforms', () => {
      expect(
        createSummary(
          fakeUpdatesSingle,
          getVariables(fakeExpoConfig, fakeUpdatesSingle, fakeOptions)
        )
      ).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for both platforms with custom app scheme', () => {
      const customSchemeConfig = { ...fakeExpoConfig, scheme: ['ega', 'expogithubaction'] };
      expect(
        createSummary(
          fakeUpdatesSingle,
          getVariables(customSchemeConfig, fakeUpdatesSingle, fakeOptions)
        )
      ).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**
        - Scheme → **expogithubaction**, **ega**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=expogithubaction&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=expogithubaction&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for android only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'android');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeOptions)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **android**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for ios only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'ios');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeOptions)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **ios**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });
  });

  describe('mutliple update groups', () => {
    it('returns expected message for both platforms', () => {
      expect(
        createSummary(
          fakeUpdatesMultiple,
          getVariables(fakeExpoConfig, fakeUpdatesMultiple, fakeOptions)
        )
      ).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**

        Android <br /> _(exposdk:47.0.0)_ <br /> **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-fake-android-id)** | iOS <br /> _(exposdk:47.0.0)_ <br /> **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-fake-ios-id)**
        --- | ---
        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-fake-android-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-fake-android-id" width="250px" height="250px" /></a> | <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-fake-ios-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-fake-ios-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for android only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'android');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeOptions)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **android**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for ios only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'ios');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeOptions)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **ios**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns Expo Go compatible QR code when forced', () => {
      const customOptions: typeof fakeOptions = { ...fakeOptions, qrTarget: 'expo-go' };
      expect(
        createSummary(
          fakeUpdatesMultiple,
          getVariables(fakeExpoConfig, fakeUpdatesMultiple, customOptions)
        )
      ).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**

        Android <br /> _(exposdk:47.0.0)_ <br /> **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-fake-android-id)** | iOS <br /> _(exposdk:47.0.0)_ <br /> **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-fake-ios-id)**
        --- | ---
        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-android-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-android-id" width="250px" height="250px" /></a> | <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-ios-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-ios-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });
  });
});
