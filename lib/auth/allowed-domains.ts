export const ALLOWED_EMAIL_DOMAINS = new Set(["columbia.edu", "barnard.edu"]);

export function isAllowedEmailDomain(email: string | null | undefined): boolean {
  const domain = email?.split("@")[1]?.toLowerCase() ?? "";
  return ALLOWED_EMAIL_DOMAINS.has(domain);
}

export function isAllowedUserProfile(
  email: string | null | undefined,
  fullName: string | null | undefined
): boolean {
  if (!email || !fullName) {
    return false;
  }
  return isAllowedEmailDomain(email);
}
