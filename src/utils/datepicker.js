const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MONTH_NAMES = {
  pl: [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

export const MONTH_SHORT_NAMES = {
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const WEEKDAY_MONDAY_FIRST = {
  pl: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export const formatIsoDate = (year, month, day) => {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseIsoDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const clean = value.trim().slice(0, 10);
  const m = clean.match(ISO_DATE_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return {
    year,
    month,
    day,
    iso: formatIsoDate(year, month, day),
  };
};

export const getTodayIso = (now = new Date()) => {
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

export const addDaysToIso = (baseIso, deltaDays = 0) => {
  const parsed = parseIsoDate(baseIso) || parseIsoDate(getTodayIso());
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utc.setUTCDate(utc.getUTCDate() + Number(deltaDays || 0));
  return formatIsoDate(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate()
  );
};

export const formatDisplayDate = (isoStr, lang = 'pl') => {
  const parsed = parseIsoDate(isoStr);
  if (!parsed) return '';
  const shorts = MONTH_SHORT_NAMES[lang === 'en' ? 'en' : 'pl'];
  const dayStr = String(parsed.day).padStart(2, '0');
  const monthLabel = shorts[parsed.month - 1] || '';
  if (lang === 'en') {
    return `${monthLabel} ${dayStr}, ${parsed.year}`;
  }
  return `${dayStr} ${monthLabel} ${parsed.year}`;
};

export const isIsoDateDisabled = (iso, { minIso = '', maxIso = '' } = {}) => {
  if (!iso) return false;
  if (minIso && iso < minIso) return true;
  if (maxIso && iso > maxIso) return true;
  return false;
};

/**
 * Builds a 42-cell (6 weeks x 7 days, Monday-first) calendar matrix for (year, month 1..12).
 */
export const buildCalendarMonthGrid = (
  year,
  month,
  { selectedIso = '', todayIso = getTodayIso(), minIso = '', maxIso = '' } = {}
) => {
  const firstOfMonthUtc = new Date(Date.UTC(year, month - 1, 1));
  // JS getUTCDay(): 0 = Sun, 1 = Mon ... 6 = Sat -> convert to Monday-first 0..6
  const mondayFirstOffset = (firstOfMonthUtc.getUTCDay() + 6) % 7;

  const gridStartUtc = new Date(Date.UTC(year, month - 1, 1 - mondayFirstOffset));
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const cellUtc = new Date(
      Date.UTC(
        gridStartUtc.getUTCFullYear(),
        gridStartUtc.getUTCMonth(),
        gridStartUtc.getUTCDate() + i
      )
    );
    const cYear = cellUtc.getUTCFullYear();
    const cMonth = cellUtc.getUTCMonth() + 1;
    const cDay = cellUtc.getUTCDate();
    const iso = formatIsoDate(cYear, cMonth, cDay);
    const weekdayIndex = i % 7; // 0 = Mon ... 5 = Sat, 6 = Sun

    cells.push({
      iso,
      year: cYear,
      month: cMonth,
      day: cDay,
      isCurrentMonth: cYear === year && cMonth === month,
      isToday: iso === todayIso,
      isSelected: Boolean(selectedIso && iso === selectedIso),
      isDisabled: isIsoDateDisabled(iso, { minIso, maxIso }),
      isWeekend: weekdayIndex >= 5,
    });
  }

  return cells;
};
