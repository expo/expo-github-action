import { ExpoConfig } from '@expo/config';

import { createSummary, getVariables, previewInput } from '../../actions/preview';
import { EasUpdate } from '../../eas';

jest.mock('../../expo');
jest.mock('../../worker');

const fakeOptions: ReturnType<typeof previewInput> = {
  command: 'eas update',
  appScheme: undefined,
  shouldComment: true,
  commentId: 'preview-test',
  workingDirectory: '.',
  githubToken: 'test-token',
  qrTarget: 'dev-client',
};

const fakeExpoConfig: ExpoConfig = {
  name: 'Fake project',
  slug: 'fake-project',
  extra: {
    eas: { projectId: 'fake-project-id' },
  },
};

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

describe(previewInput, () => {
  it('reads the native scheme override from the action input', () => {
    const previous = process.env['INPUT_APP-SCHEME'];
    process.env['INPUT_APP-SCHEME'] = 'myapp-dev';
    try {
      expect(previewInput().appScheme).toBe('myapp-dev');
    } finally {
      if (previous === undefined) {
        delete process.env['INPUT_APP-SCHEME'];
      } else {
        process.env['INPUT_APP-SCHEME'] = previous;
      }
    }
  });
});

describe(getVariables, () => {
  it('keeps the generated scheme when config contains a variant-specific scheme', () => {
    const vars = getVariables(
      { ...fakeExpoConfig, scheme: 'myapp-production' },
      fakeUpdatesMultiple,
      fakeOptions
    );
    for (const value of [vars.qr, vars.androidQR, vars.iosQR]) {
      const qr = new URL(value);
      expect(qr.origin + qr.pathname).toBe('https://qr.expo.dev/eas-update');
      expect(qr.searchParams.get('appScheme')).toBe('fake-project');
    }
  });

  it('uses an explicit native scheme for every update group and the comment', () => {
    const options = { ...fakeOptions, appScheme: 'myapp-dev' };
    const vars = getVariables(
      { ...fakeExpoConfig, scheme: ['myapp-production', 'com.example.third-party-long'] },
      fakeUpdatesMultiple,
      options
    );
    expect(vars.projectScheme).toBe('myapp-dev');
    expect(JSON.parse(vars.projectSchemes)).toEqual(['myapp-dev']);
    for (const [value, group] of [
      [vars.qr, 'fake-group-fake-android-id'],
      [vars.androidQR, 'fake-group-fake-android-id'],
      [vars.iosQR, 'fake-group-fake-ios-id'],
    ]) {
      const qr = new URL(value);
      expect(qr.origin + qr.pathname).toBe('https://qr.expo.dev/development-client');
      expect(qr.searchParams.get('appScheme')).toBe('myapp-dev');
      expect(qr.searchParams.get('url')).toBe(`https://u.expo.dev/fake-project-id/group/${group}`);
    }
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

        <a href="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id"><img src="https://qr.expo.dev/eas-update?appScheme=fake-project&projectId=fake-project-id&groupId=fake-group-id" width="250px" height="250px" /></a>

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
