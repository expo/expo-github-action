import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fs, vol } from 'memfs';
import path from 'node:path';

import { determineSourceAppPathAsync } from '../repackUtils';

mock.module('node:fs', () => ({ default: fs }));
mock.module('node:fs/promises', () => ({ default: fs.promises }));
mock.module('glob', () => ({
  glob: async (pattern: string, options: { cwd: string; absolute: boolean }) => {
    const result = await vol.promises.glob(pattern, { cwd: options.cwd });
    if (options.absolute) {
      return result.map((file) => path.join(options.cwd, file));
    }
    return result;
  },
}));

describe('determineSourceAppPathAsync', () => {
  const tempDir = '/tmp/test';

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    vol.reset();
  });

  it('should return the absolute path when given a file path', async () => {
    const apkPath = path.join(tempDir, 'app.apk');
    await fs.promises.writeFile(apkPath, '');

    const result = await determineSourceAppPathAsync(apkPath);
    expect(result).toBe(apkPath);
  });

  it('should find apk file in directory', async () => {
    const apkPath = path.join(tempDir, 'app.apk');
    await fs.promises.writeFile(apkPath, '');

    const result = await determineSourceAppPathAsync(tempDir);
    expect(result).toBe(apkPath);
  });

  it('should find aab file in directory', async () => {
    const aabPath = path.join(tempDir, 'app.aab');
    await fs.promises.writeFile(aabPath, '');

    const result = await determineSourceAppPathAsync(tempDir);
    expect(result).toBe(aabPath);
  });

  it('should find ipa file in directory', async () => {
    const ipaPath = path.join(tempDir, 'app.ipa');
    await fs.promises.writeFile(ipaPath, '');

    const result = await determineSourceAppPathAsync(tempDir);
    expect(result).toBe(ipaPath);
  });

  it('should throw error when source app file does not exist', async () => {
    const nonExistentPath = path.join(tempDir, 'nonexistent.apk');

    await expect(determineSourceAppPathAsync(nonExistentPath)).rejects.toThrow(
      `The source app file does not exist: ${nonExistentPath}`
    );
  });

  it('should throw error when no app files found in directory', async () => {
    await expect(determineSourceAppPathAsync(tempDir)).rejects.toThrow(
      `No app files found in the directory: ${tempDir}`
    );
  });

  it('should throw error when multiple app files found in directory', async () => {
    await fs.promises.writeFile(path.join(tempDir, 'app1.apk'), '');
    await fs.promises.writeFile(path.join(tempDir, 'app2.apk'), '');

    await expect(determineSourceAppPathAsync(tempDir)).rejects.toThrow(
      `Multiple app files found in the directory: ${tempDir}`
    );
  });

  it('should ignore non-app files in directory', async () => {
    const apkPath = path.join(tempDir, 'app.apk');
    await fs.promises.writeFile(apkPath, '');
    await fs.promises.writeFile(path.join(tempDir, 'README.md'), '');
    await fs.promises.writeFile(path.join(tempDir, 'config.json'), '');

    const result = await determineSourceAppPathAsync(tempDir);
    expect(result).toBe(apkPath);
  });
});
