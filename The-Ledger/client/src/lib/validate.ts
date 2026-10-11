/** Small shared field validators (front-end only; the backend will re-validate). */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isUkSortCode = (v: string) => /^\d{2}-\d{2}-\d{2}$/.test(v.trim());
export const isAccountNumber = (v: string) => /^\d{6,8}$/.test(v.replace(/\s/g, ""));
