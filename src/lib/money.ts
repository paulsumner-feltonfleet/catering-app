const formatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatGBP(amount: number): string {
  if (!Number.isFinite(amount)) return formatter.format(0);
  return formatter.format(amount);
}

export function parseQuantity(value: string): number {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}
