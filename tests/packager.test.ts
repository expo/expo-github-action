import { resolvePackage } from '../src/packager';

describe(resolvePackage, () => {
  it('resolves expo-cli@^2.0.0 to 2.21.2', async () => {
    await expect(resolvePackage('expo-cli', '^2.0.0')).resolves.toBe('2.21.2');
  });

  it('resolves expo-cli@~3.15.0 to 3.15.5', async () => {
    await expect(resolvePackage('expo-cli', '~3.15.0')).resolves.toBe('3.15.5');
  });

  it('resolves eas-cli@~0.33.0 to 0.33.1', async () => {
    await expect(resolvePackage('eas-cli', '~0.33.0')).resolves.toBe('0.33.1');
  });

  it('resolves expo-cli@latest to a version', async () => {
    await expect(resolvePackage('expo-cli', 'latest')).resolves.not.toMatch('latest');
  });

  it('rejects donotpublishthispackageoryouwillbefired with proper error', async () => {
    await expect(resolvePackage('donotpublishthispackageoryouwillbefired', 'latest')).rejects.toThrow(
      'Could not resolve'
    );
  });

  it('rejects expo-cli@9999999 with proper error', async () => {
    await expect(resolvePackage('expo-cli', '9999999')).rejects.toThrow('Could not resolve');
  });
});
