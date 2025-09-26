import {
  BunPackageManager,
  NpmPackageManager,
  PnpmPackageManager,
  YarnPackageManager,
} from '@expo/package-manager';
import { describe, expect, it, mock } from 'bun:test';

import { createPackageManager, resolvePackageVersion } from '../packages';

describe(createPackageManager, () => {
  it('returns bun package manager', () => {
    const manager = createPackageManager('bun', { cwd: '/test' });
    expect(manager).toBeInstanceOf(BunPackageManager);
    expect(manager.options.cwd).toBe('/test');
  });

  it('returns npm package manager', () => {
    const manager = createPackageManager('npm', { cwd: '/test' });
    expect(manager).toBeInstanceOf(NpmPackageManager);
    expect(manager.options.cwd).toBe('/test');
  });

  it('returns pnpm package manager', () => {
    const manager = createPackageManager('pnpm', { cwd: '/test' });
    expect(manager).toBeInstanceOf(PnpmPackageManager);
    expect(manager.options.cwd).toBe('/test');
  });

  it('returns yarn package manager', () => {
    const manager = createPackageManager('yarn', { cwd: '/test' });
    expect(manager).toBeInstanceOf(YarnPackageManager);
    expect(manager.options.cwd).toBe('/test');
  });

  it('handles case insensitive package manager names', () => {
    expect(createPackageManager('NPM')).toBeInstanceOf(NpmPackageManager);
    expect(createPackageManager('Yarn')).toBeInstanceOf(YarnPackageManager);
    expect(createPackageManager(' pnpm ')).toBeInstanceOf(PnpmPackageManager);
  });

  it('throws for unknown package manager', () => {
    expect(() => createPackageManager('composer')).toThrow(
      `Unknown package manager provided 'composer', expected 'bun', 'npm', 'pnpm', or 'yarn'.`
    );
  });
});

describe(resolvePackageVersion, () => {
  it('resolves version when npm outputs single version', async () => {
    mock.module('@actions/exec', () => ({
      getExecOutput: mock().mockResolvedValue({ stdout: JSON.stringify('16.19.2') }),
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'npm')).resolves.toBe('16.19.2');
  });

  it('resolves version when npm outputs multiple versions', async () => {
    const versions = ['16.18.1', '16.19.0', '16.19.1', '16.19.2'];
    mock.module('@actions/exec', () => ({
      getExecOutput: mock().mockResolvedValue({ stdout: JSON.stringify(versions) }),
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'npm')).resolves.toBe('16.19.2');
  });

  // Yarn does not support the `info` command
  it('resolves version with npm when using yarn', async () => {
    const getExecOutput = mock().mockResolvedValue({ stdout: JSON.stringify('16.19.2') });
    mock.module('@actions/exec', () => ({ getExecOutput }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'yarn')).resolves.toBe('16.19.2');
    expect(getExecOutput).toHaveBeenCalledWith('npm', [
      'info',
      'eas-cli@latest',
      'version',
      '--json',
    ]);
  });

  it('throws when npm outputs nothing', async () => {
    mock.module('@actions/exec', () => ({
      getExecOutput: mock().mockResolvedValue({ stdout: '' }),
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'npm')).rejects.toThrow(
      `Could not resolve 'eas-cli@latest', invalid version provided.`
    );
  });

  it('throws when npm outputs invalid json', async () => {
    mock.module('@actions/exec', () => ({
      getExecOutput: mock().mockResolvedValue({
        stdout: 'Some npm versions might accidentally output logs instead of json',
      }),
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'npm')).rejects.toThrow(
      `Failed parsing 'eas-cli@latest' JSON formatted package information.`
    );
  });

  it('throws when npm outputs empty string', async () => {
    mock.module('@actions/exec', () => ({
      getExecOutput: mock().mockResolvedValue({ stdout: JSON.stringify('') }),
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'npm')).rejects.toThrow(
      `Could not resolve 'eas-cli@latest', no versions found.`
    );
  });

  it('throws when npm outputs empty array', async () => {
    mock.module('@actions/exec', () => ({
      getExecOutput: mock().mockResolvedValue({ stdout: JSON.stringify([]) }),
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'npm')).rejects.toThrow(
      `Could not resolve 'eas-cli@latest', no versions found.`
    );
  });

  it('handles yarn manager by converting to npm', async () => {
    const mockGetExecOutput = mock().mockResolvedValue({ stdout: JSON.stringify('16.19.2') });
    mock.module('@actions/exec', () => ({
      getExecOutput: mockGetExecOutput,
    }));
    await expect(resolvePackageVersion('eas-cli', 'latest', 'yarn')).resolves.toBe('16.19.2');
    expect(mockGetExecOutput).toHaveBeenCalledWith('npm', [
      'info',
      'eas-cli@latest',
      'version',
      '--json',
    ]);
  });
});
