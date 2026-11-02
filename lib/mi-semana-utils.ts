// Week A reference: Monday 2026-11-02
const REF_MONDAY = new Date('2026-11-02T00:00:00.000Z');

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function getWeekVariant(date: Date): 'A' | 'B' {
  const monday = getMonday(date);
  const diffMs = monday.getTime() - REF_MONDAY.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks % 2 === 0 ? 'A' : 'B';
}

export function getPeriodoInicio(date: Date, frecuencia: 'semanal' | 'mensual' | 'trimestral'): string {
  if (frecuencia === 'semanal') {
    const m = getMonday(date);
    return m.toISOString().slice(0, 10);
  }
  if (frecuencia === 'mensual') {
    // First Monday of the month
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const dow = d.getUTCDay();
    const daysToMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
    d.setUTCDate(d.getUTCDate() + daysToMonday);
    return d.toISOString().slice(0, 10);
  }
  // trimestral — first Monday of Jan, Apr, Jul, Oct
  const month = date.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const d = new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
  const dow = d.getUTCDay();
  const daysToMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return d.toISOString().slice(0, 10);
}

export const OWNER_EMAIL = 'yehisson@somosdex.com';
