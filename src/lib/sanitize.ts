export function stripHtml(s: string): string { return s.replace(/<[^>]*>/g, '').trim() }
export function escapeHtml(s: string): string { const m: Record<string,string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}; return s.replace(/[&<>"']/g, c => m[c] || c) }
export function sanitizeObject<T extends Record<string,any>>(obj: T): T { const c = { ...obj }; for (const k of Object.keys(c)) if (typeof c[k]==='string') c[k]=stripHtml(c[k]); return c }
