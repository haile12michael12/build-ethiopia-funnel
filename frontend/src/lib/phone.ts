export function normalizeEthiopianPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("251") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0") && digits.length === 10) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

export function isValidEthiopianPhone(phone?: string) {
  const n = normalizeEthiopianPhone(phone);
  return /^0[79]\d{8}$/.test(n);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
