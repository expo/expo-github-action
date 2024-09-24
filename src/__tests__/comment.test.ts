import { ExpoConfig } from '@expo/config';

import { getQrTarget, getSchemesInOrderFromConfig } from '../comment';
import { projectAppType } from '../expo';

jest.mock('../expo');

const fakeOptions = {
  workingDirectory: '',
};

describe(getQrTarget, () => {
  it('returns `dev-build` for `qr-target: dev-build`', () => {
    expect(getQrTarget({ ...fakeOptions, qrTarget: 'dev-build' })).toBe('dev-build');
  });

  it('returns `dev-build` for `qr-target: dev-client`', () => {
    expect(getQrTarget({ ...fakeOptions, qrTarget: 'dev-client' })).toBe('dev-build');
  });

  it('returns `expo-go` for `qr-target: expo-go`', () => {
    expect(getQrTarget({ ...fakeOptions, qrTarget: 'expo-go' })).toBe('expo-go');
  });

  it('throws for unknown `qr-target`', () => {
    expect(() => getQrTarget({ ...fakeOptions, qrTarget: 'unknown' } as any)).toThrow(
      `Invalid QR code target: "unknown", expected "expo-go" or "dev-build"`
    );
  });

  it('returns infered `dev-build` when input is omitted', () => {
    jest.mocked(projectAppType).mockReturnValue('dev-build');
    expect(getQrTarget({ ...fakeOptions, qrTarget: undefined })).toBe('dev-build');
  });

  it('returns infered `expo-go` when input is omitted', () => {
    jest.mocked(projectAppType).mockReturnValue('expo-go');
    expect(getQrTarget({ ...fakeOptions, qrTarget: undefined })).toBe('expo-go');
  });
});

describe(getSchemesInOrderFromConfig, () => {
  it('returns empty array when not defined', () => {
    expect(getSchemesInOrderFromConfig({} as ExpoConfig)).toEqual([]);
  });

  it('returns scheme as array when defined as string', () => {
    expect(getSchemesInOrderFromConfig({ scheme: 'ega' } as ExpoConfig)).toEqual(['ega']);
  });

  it('returns schemes in order when defined as array', () => {
    expect(
      getSchemesInOrderFromConfig({ scheme: ['ega', 'expogithubaction'] } as ExpoConfig)
    ).toEqual(['expogithubaction', 'ega']);
  });
});
