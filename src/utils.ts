export function template(template: string, replacements: Record<string, string>) {
  let result = template;
  for (const name in replacements) {
    result = result.replaceAll(`{${name}}`, replacements[name]);
  }
  return result;
}
