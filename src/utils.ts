/**
 * Replace all template variables in a string.
 * This uses the notation of `{varname}`, which can be defined as object.
 */
export function template(template: string, replacements: Record<string, string>) {
  let result = template;
  for (const name in replacements) {
    result = result.replaceAll(`{${name}}`, replacements[name]);
  }
  return result;
}

/**
 * Retry an async function a number of times with a delay between each attempt.
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  retries: number,
  delayAfterErrorMs: number = 5000
): Promise<T> {
  let result: T | undefined = undefined;
  let lastError: Error | undefined;
  for (let i = 0; i < retries; ++i) {
    try {
      result = await fn();
      break;
    } catch (e) {
      if (e instanceof Error) {
        lastError = e;
        await delayAsync(delayAfterErrorMs);
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  if (result === undefined) {
    throw new Error('Function did not return a value');
  }
  return result;
}

/**
 * Delay by the given milliseconds.
 */
export async function delayAsync(timeMs: number) {
  return new Promise(resolve => setTimeout(resolve, timeMs));
}
