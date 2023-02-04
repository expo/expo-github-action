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

export function errorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}
