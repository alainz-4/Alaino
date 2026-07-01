export function formatMoney(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format(value ?? 0);
}

export function formatPercent(value: number) {
  return `${(value ?? 0).toFixed(1)}%`;
}
