/** «l****@ejemplo.es»: enough to recognise the address on a shared screen. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.charAt(0)}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}
