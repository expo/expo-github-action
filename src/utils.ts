import { DEFAULT_SYSTEM_QR } from './actions/eas-update';
import { createEasQr, Platform, Update } from './expo';

export function template(template: string, replacements: Record<string, string>) {
  let result = template;
  for (const name in replacements) {
    result = result.replaceAll(`{${name}}`, replacements[name]);
  }
  return result;
}

export function createPlatformQr(update: Update[], platform: Platform, messageBody: string) {
  const platormUpdate = update.find(u => u.platform === platform);
  if (platormUpdate) {
    const qr = createEasQr(platormUpdate.id);
    messageBody += template(DEFAULT_SYSTEM_QR, { system: platform, qr });
    return qr;
  }
  return null;
}
