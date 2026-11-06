import { getUpdateGroupQr } from '../eas';

describe(getUpdateGroupQr, () => {
  it.each([
    { staging: '', host: 'u.expo.dev' },
    { staging: '1', host: 'staging-u.expo.dev' },
  ])('uses the native scheme and $host for development builds', ({ staging, host }) => {
    const previous = process.env.EXPO_STAGING;
    process.env.EXPO_STAGING = staging;
    try {
      const qr = new URL(
        getUpdateGroupQr({
          qrTarget: 'dev-build',
          projectId: 'projectId',
          updateGroupId: 'updateGroupId',
          appSlug: 'appslug',
          appScheme: 'com.example.app-dev',
        })
      );
      expect(qr.origin + qr.pathname).toBe('https://qr.expo.dev/development-client');
      expect(qr.searchParams.get('appScheme')).toBe('com.example.app-dev');
      expect(qr.searchParams.get('url')).toBe(`https://${host}/projectId/group/updateGroupId`);
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_STAGING;
      } else {
        process.env.EXPO_STAGING = previous;
      }
    }
  });

  it('returns url for expo-go', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'expo-go',
        appScheme: 'myapp-dev',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'appslug',
      })
    ).toBe('https://qr.expo.dev/eas-update?projectId=projectId&groupId=updateGroupId');
  });

  it('returns url for dev-build', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'dev-build',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'appslug',
        appScheme: undefined,
      })
    ).toBe(
      'https://qr.expo.dev/eas-update?appScheme=appslug&projectId=projectId&groupId=updateGroupId'
    );
  });

  it('returns url for dev-build, with `_` in appSlug', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'dev-build',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'hello_world',
        appScheme: undefined,
      })
    ).toBe(
      'https://qr.expo.dev/eas-update?appScheme=helloworld&projectId=projectId&groupId=updateGroupId'
    );
  });
});
