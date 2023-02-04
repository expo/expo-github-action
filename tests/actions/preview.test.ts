import { ExpoConfig } from '@expo/config';

import { getMessage, getVariables } from '../../src/actions/preview';
import { EasUpdate } from '../../src/eas';

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

describe(getMessage, () => {
  describe('single update group', () => {
    it('returns expected message for both platforms', () => {
      expect(getMessage(fakeUpdatesSingle, getVariables(fakeExpoConfig, fakeUpdatesSingle))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platforms → **android**, **ios**
        - Runtime Version → **exposdk:47.0.0**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)"
      `);
    });

    it('returns expected message for android only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'android');
      expect(getMessage(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **android**
        - Runtime Version → **exposdk:47.0.0**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)"
      `);
    });

    it('returns expected message for ios only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'ios');
      expect(getMessage(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **ios**
        - Runtime Version → **exposdk:47.0.0**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)"
      `);
    });
  });

  describe('mutliple update groups', () => {
    it('returns expected message for both platforms', () => {
      expect(getMessage(fakeUpdatesMultiple, getVariables(fakeExpoConfig, fakeUpdatesMultiple))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**

        Android <br /> _(exposdk:47.0.0)_ | iOS <br /> _(exposdk:47.0.0)_
        --- | ---
        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-android-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-android-id" width="250px" height="250px" /></a> | <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-ios-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-fake-ios-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)"
      `);
    });

    it('returns expected message for android only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'android');
      expect(getMessage(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **android**
        - Runtime Version → **exposdk:47.0.0**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)"
      `);
    });

    it('returns expected message for ios only', () => {
      const fakeUpdate = fakeUpdatesSingle.filter(update => update.platform === 'ios');
      expect(getMessage(fakeUpdate, getVariables(fakeExpoConfig, fakeUpdate))).toMatchInlineSnapshot(`
        "🚀 Expo preview is ready!

        - Project → **fake-project**
        - Platform → **ios**
        - Runtime Version → **exposdk:47.0.0**

        <a href="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

        > Learn more about [𝝠 Expo Github Action](https://github.com/expo/expo-github-action#publish-a-preview-from-pr)"
      `);
    });
  });
});
