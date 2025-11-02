/**
 * Device Fingerprinting Utility
 *
 * Generates a unique device fingerprint for anonymous survey responses.
 * This fingerprint is used server-side to create a SHA-256 hash combined with IP and date.
 *
 * Privacy Note: This is not for tracking users - it's for deduplication only.
 * The fingerprint changes daily when combined with the date on the backend.
 */

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  touchSupport: boolean;
  timestamp: number;
}

/**
 * Generate a device fingerprint from browser characteristics.
 *
 * This captures stable device properties that are unlikely to change
 * within a day, but doesn't track users long-term.
 *
 * @returns Device fingerprint object
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    timestamp: Date.now(),
  };

  // Add device memory if available (Chrome only)
  if ('deviceMemory' in navigator) {
    fingerprint.deviceMemory = (navigator as any).deviceMemory;
  }

  return fingerprint;
}

/**
 * Convert device fingerprint to a string for transmission to backend.
 *
 * @param fingerprint Device fingerprint object
 * @returns Fingerprint string
 */
export function fingerprintToString(fingerprint: DeviceFingerprint): string {
  return JSON.stringify(fingerprint);
}

/**
 * Generate and convert device fingerprint to string in one call.
 *
 * @returns Fingerprint string
 */
export function getDeviceFingerprintString(): string {
  const fingerprint = generateDeviceFingerprint();
  return fingerprintToString(fingerprint);
}

/**
 * Check if device appears to be mobile.
 * Useful for optimizing the survey UI.
 *
 * @returns True if mobile device detected
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if device supports touch input.
 *
 * @returns True if touch is supported
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get device type for analytics/logging.
 *
 * @returns Device type string
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}
