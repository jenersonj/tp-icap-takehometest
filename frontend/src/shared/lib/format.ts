const cache = new Map<string, Intl.NumberFormat>();

function formatter(min: number, max: number, signed = false): Intl.NumberFormat {
  const key = `${min}-${max}-${signed}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      signDisplay: signed ? 'exceptZero' : 'auto',
    });
    cache.set(key, f);
  }
  return f;
}

const DASH = '—';

export function formatQty(value: number | null | undefined): string {
  return value === null || value === undefined ? DASH : formatter(0, 0).format(value);
}

/** Pence-level prices keep 4 dp; others 2, up to the 6 dp a trade allows. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  return Math.abs(value) < 10 ? formatter(4, 6).format(value) : formatter(2, 6).format(value);
}

export function formatMoney(value: number | null | undefined, { signed = false } = {}): string {
  return value === null || value === undefined ? DASH : formatter(2, 2, signed).format(value);
}

/** -1, 0 or 1, for P&L and tick colouring. */
export function signOf(value: number | null | undefined): -1 | 0 | 1 {
  if (!value) return 0;
  return value > 0 ? 1 : -1;
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const time = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : DASH;
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? time.format(new Date(iso)) : DASH;
}

/** For <input type="datetime-local">: local wall-clock time without seconds' fraction. */
export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fromDateTimeLocal(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
