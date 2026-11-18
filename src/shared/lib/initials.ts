const INITIALS_LENGTH = 2

/** Up to two initials of a name, e.g. "Saqib Rafiq" → "SR". */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, INITIALS_LENGTH)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
