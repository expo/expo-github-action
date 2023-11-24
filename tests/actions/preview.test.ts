import { ExpoConfig } from '@expo/config';

import { createSummary, getSchemeFromConfig, getVariables, previewInput } from '../../src/actions/preview';
import { EasUpdate } from '../../src/eas';

const fakeInput = {} as unknown as ReturnType<typeof previewInput>;

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

const fakeUpdatesMultiple = fakeUpdatesSingle.map(update => ({ ...update, group: `fake-group-${update.id}` }));

describe(getSchemeFromConfig, () => {
  it('returns `null` when not defined', () => {
    expect(getSchemeFromConfig({} as ExpoConfig)).toBeNull();
  });

  it('returns scheme when defined as string', () => {
    expect(getSchemeFromConfig({ scheme: 'ega' } as ExpoConfig)).toBe('ega');
  });

  it('returns longest scheme when defined as array', () => {
    expect(getSchemeFromConfig({ scheme: ['ega', 'expogithubaction'] } as ExpoConfig)).toBe('expogithubaction');
  });
});

describe(createSummary, () => {
  describe('single update group', () => {
    it('returns expected message for both platforms', () => {
      expect(createSummary(fakeUpdatesSingle, getVariables(fakeExpoConfig, fakeUpdatesSingle, fakeInput)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for both platforms with custom app scheme', () => {
      const customSchemeConfig = { ...fakeExpoConfig, scheme: ['ega', 'expogithubaction'] };
      expect(createSummary(fakeUpdatesSingle, getVariables(customSchemeConfig, fakeUpdatesSingle, fakeInput)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**
        - Scheme → **expogithubaction**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=expogithubaction&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=expogithubaction&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for both platforms with overwriten app scheme', () => {
      const customInput = { ...fakeInput, appScheme: 'expogithubaction' };
      expect(createSummary(fakeUpdatesSingle, getVariables(fakeExpoConfig, fakeUpdatesSingle, customInput)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**
        - Scheme → **expogithubaction**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?appScheme=expogithubaction&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=expogithubaction&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for android only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'android');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeInput))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **android**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for ios only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'ios');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeInput))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **ios**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });
  });

  describe('mutliple update groups', () => {
    it('returns expected message for both platforms', () => {
      expect(createSummary(fakeUpdatesMultiple, getVariables(fakeExpoConfig, fakeUpdatesMultiple, fakeInput)))
        .toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**

        Android <br /> _(exposdk:47.0.0)_ <br /> **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-fake-android-id)** | iOS <br /> _(exposdk:47.0.0)_ <br /> **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-fake-ios-id)**
        --- | ---
        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-android-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-android-id" width="250px" height="250px" /></a> | <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-ios-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-ios-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for android only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'android');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeInput))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **android**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });

    it('returns expected message for ios only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'ios');
      expect(createSummary(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate, fakeInput))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **ios**
        - Runtime Version → **exposdk:47.0.0**
        - **[More info](https://expo.dev/projects/fake-project-id/updates/fake-group-id)**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action/tree/main/preview#example-workflows)"
      `);
    });
  });
});
