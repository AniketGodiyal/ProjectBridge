const RESOURCE_QR_PREFIX = 'PROJECTBRIDGE:RESOURCE:';

export function resourceQrPayload(token: string): string {
  return `${RESOURCE_QR_PREFIX}${token}`;
}

export function parseResourceQrPayload(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(RESOURCE_QR_PREFIX)) return null;
  const token = trimmed.slice(RESOURCE_QR_PREFIX.length);
  return token.length > 0 ? token : null;
}
