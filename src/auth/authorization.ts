export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes(required)) return true
  if (!required.endsWith('.view')) return false
  const prefix = required.slice(0, -5)
  return granted.includes(`${prefix}.manage`) || granted.includes(`${prefix}.create`)
}

export function hasAnyPermission(granted: readonly string[], required: readonly string[]): boolean {
  return required.some((permission) => hasPermission(granted, permission))
}
