const DEVICE_KEY = "aeroconcierge_device_id";

export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const generated = `dev_${crypto.randomUUID()}`;
  localStorage.setItem(DEVICE_KEY, generated);
  return generated;
}
