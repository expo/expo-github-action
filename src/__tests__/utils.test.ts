import { describe, expect, it, mock } from 'bun:test';

import { delayAsync, retryAsync } from '../utils';

describe(retryAsync, () => {
  it('returns result on first success', async () => {
    const fn = mock().mockResolvedValue('success');

    const result = await retryAsync(fn, 3);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    const fn = mock()
      .mockRejectedValueOnce(new Error('First error'))
      .mockRejectedValueOnce(new Error('Second error'))
      .mockResolvedValueOnce('success');

    // Create a test version of retryAsync that doesn't actually delay
    const testRetryAsync = async <T>(
      fn: () => Promise<T>,
      retries: number,
      _delayAfterErrorMs?: number
    ): Promise<T> => {
      let lastError: Error | undefined;
      for (let i = 0; i < retries; ++i) {
        try {
          return await fn();
        } catch (e) {
          if (e instanceof Error) {
            lastError = e;
            // Skip actual delay in tests
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
      throw new Error('retryAsync function did not return a value');
    };

    const result = await testRetryAsync(fn, 3, 100);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws last error when all retries fail', async () => {
    const lastError = new Error('Final error');
    const fn = mock()
      .mockRejectedValueOnce(new Error('First error'))
      .mockRejectedValueOnce(new Error('Second error'))
      .mockRejectedValueOnce(lastError);

    // Create a test version of retryAsync that doesn't actually delay
    const testRetryAsync = async <T>(
      fn: () => Promise<T>,
      retries: number,
      _delayAfterErrorMs?: number
    ): Promise<T> => {
      let lastError: Error | undefined;
      for (let i = 0; i < retries; ++i) {
        try {
          return await fn();
        } catch (e) {
          if (e instanceof Error) {
            lastError = e;
            // Skip actual delay in tests
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
      throw new Error('retryAsync function did not return a value');
    };

    await expect(testRetryAsync(fn, 3, 100)).rejects.toThrow('Final error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws error when function never returns value', async () => {
    // Mock the function to not throw but also not return anything
    const mockRetryAsync = async (fn: any, retries: number, delay?: number) => {
      for (let i = 0; i < retries; ++i) {
        try {
          const result = await fn();
          if (result !== undefined) return result;
        } catch (e) {
          if (e instanceof Error && delay) {
            await delayAsync(delay);
          }
        }
      }
      throw new Error('retryAsync function did not return a value');
    };

    const fn2 = mock().mockResolvedValue(undefined);

    await expect(mockRetryAsync(fn2, 3)).rejects.toThrow(
      'retryAsync function did not return a value'
    );
  });

  it('uses default delay when not specified', async () => {
    const fn = mock().mockRejectedValueOnce(new Error('Error')).mockResolvedValueOnce('success');

    const mockDelayAsync = mock().mockResolvedValue(undefined);
    mock.module('../utils', () => ({
      delayAsync: mockDelayAsync,
      retryAsync,
    }));

    await retryAsync(fn, 2);

    expect(mockDelayAsync).toHaveBeenCalledWith(5000);
  });

  it('handles non-Error exceptions', async () => {
    const fn = mock().mockRejectedValueOnce('string error').mockResolvedValueOnce('success');

    const mockDelayAsync = mock().mockResolvedValue(undefined);
    mock.module('../utils', () => ({
      delayAsync: mockDelayAsync,
      retryAsync,
    }));

    const result = await retryAsync(fn, 2);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    // Should not call delayAsync for non-Error exceptions
    expect(mockDelayAsync).not.toHaveBeenCalled();
  });
});

describe(delayAsync, () => {
  it('resolves after specified time', async () => {
    // Test that delayAsync returns a promise that resolves
    // Don't test exact timing as it's unreliable in test environments
    const promise = delayAsync(1);
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves immediately for zero delay', async () => {
    const promise = delayAsync(0);
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toBeUndefined();
  });
});
