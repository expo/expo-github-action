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
 * Create a template to interpolate template strings from another string.
 * This uses `new Function` and should not be used with untrusted input.
 * Note, this action is executed in the user's own action, by the user or a contributor with access.
 */
export function templateLiteral(template: string, variables: Record<string, string>) {
  /* eslint-disable no-new-func */
  return new Function(`return \`${template}\`;`).call(variables);
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
