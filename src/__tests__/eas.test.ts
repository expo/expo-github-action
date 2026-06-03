import { getUpdateGroupQr } from '../eas';

describe(getUpdateGroupQr, () => {
  it('returns url for expo-go', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'expo-go',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'appslug',
      })
    ).toBe('https://qr.expo.dev/eas-update?projectId=projectId&groupId=updateGroupId');
  });

  it('returns url for dev-build with appSlug fallback', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'dev-build',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'appslug',
      })
    ).toBe(
      'https://qr.expo.dev/eas-update?appScheme=appslug&projectId=projectId&groupId=updateGroupId'
    );
  });

  it('returns url for dev-build with projectScheme', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'dev-build',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'appslug',
        projectScheme: 'myscheme',
      })
    ).toBe(
      'https://qr.expo.dev/eas-update?appScheme=myscheme&projectId=projectId&groupId=updateGroupId'
    );
  });

  it('returns url for dev-build, with `_` in appSlug fallback', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'dev-build',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'hello_world',
      })
    ).toBe(
      'https://qr.expo.dev/eas-update?appScheme=helloworld&projectId=projectId&groupId=updateGroupId'
    );
  });

  it('returns url for dev-build, with `_` in projectScheme', () => {
    expect(
      getUpdateGroupQr({
        qrTarget: 'dev-build',
        projectId: 'projectId',
        updateGroupId: 'updateGroupId',
        appSlug: 'hello_world',
        projectScheme: 'my_custom_scheme',
      })
    ).toBe(
      'https://qr.expo.dev/eas-update?appScheme=mycustomscheme&projectId=projectId&groupId=updateGroupId'
    );
  });
});