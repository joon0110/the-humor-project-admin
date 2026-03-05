export const ALLOWED_EMAIL_DOMAINS = new Set(["columbia.edu", "barnard.edu"]);

export function isAllowedEmailDomain(email: string | null | undefined): boolean {
  const domain = email?.split("@")[1]?.toLowerCase() ?? "";
  return ALLOWED_EMAIL_DOMAINS.has(domain);
}
