import assert from 'node:assert';
import { gridDays } from './calendarDates';

for (const month of ['2026-03', '2026-08', '2026-11', '2027-05', '2027-08']) {
  const days = gridDays(`${month}-01`);
  assert.equal(days.length, 42, `${month} needs six weeks`);
}
for (let year = 2024; year <= 2028; year++) {
  for (let month = 1; month <= 12; month++) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const days = gridDays(`${prefix}-15`);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    assert.equal(days.filter(d => d.startsWith(prefix)).length, lastDay);
    assert.equal(new Set(days).size, days.length);
    assert.equal(new Date(`${days[0]}T12:00:00Z`).getUTCDay(), 1);
    assert.equal(days.length % 7, 0);
  }
}
assert(gridDays('2024-02-01').includes('2024-02-29'));
console.log('Calendar: every day present across 60 months, including leap years.');
