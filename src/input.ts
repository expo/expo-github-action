import { InputOptions, getInput as getActionInput } from '@actions/core';

export function getInput(name: string, options: { required: true }): string;
export function getInput(name: string): string | null;
export function getInput(name: string, options?: InputOptions): string | null {
  const value = getActionInput(name, options);
  if (!value) {
    if (options?.required) {
      throw new Error(`Input ${name} is required.`);
    }
    return null;
  }
  return value;
}
