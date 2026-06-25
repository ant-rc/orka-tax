/** Pick the active fiscal profile: the stored one if still valid, else the first. */
export function resolveActiveProfileId(
  storedId: string | null,
  profileIds: string[],
): string | null {
  if (storedId && profileIds.includes(storedId)) return storedId;
  return profileIds[0] ?? null;
}
