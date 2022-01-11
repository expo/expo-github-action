import { valid as validVersion } from 'semver';
import { resolveVersion } from '../src/packager';

describe(resolveVersion, () => {
  it('resolves expo-cli@^2.0.0 to 2.21.2', async () => {
    await expect(resolveVersion('expo-cli', '^2.0.0')).resolves.toBe('2.21.2');
  });

  it('resolves expo-cli@~3.15.0 to 3.15.5', async () => {
    await expect(resolveVersion('expo-cli', '~3.15.0')).resolves.toBe('3.15.5');
  });

  it('resolves eas-cli@~0.33.0 to 0.33.1', async () => {
    await expect(resolveVersion('eas-cli', '~0.33.0')).resolves.toBe('0.33.1');
  });

  it('resolves expo-cli@latest to a valid version', async () => {
    const version = await resolveVersion('expo-cli', 'latest');
    expect(validVersion(version)).not.toBeNull();
  });

  it('rejects donotpublishthispackageoryouwillbefired with', async () => {
    await expect(resolveVersion('donotpublishthispackageoryouwillbefired', 'latest')).rejects.toThrow(
      'Could not resolve version "latest" of "donotpublishthispackageoryouwillbefired"'
    );
  });
});
