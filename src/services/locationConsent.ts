export type LocationConsentChoice = 'accepted' | 'later';

const STORAGE_KEY = 'roo-thang:location-consent';

export function readLocationConsent(): LocationConsentChoice | undefined {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'later' ? value : undefined;
  } catch {
    return undefined;
  }
}

export function rememberLocationConsent(choice: LocationConsentChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable in private/restricted contexts. The current
    // session still works; only the prompt preference cannot be remembered.
  }
}
