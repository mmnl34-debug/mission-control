// USD → EUR conversie. Kosten worden in USD opgeslagen (Anthropic API bron),
// maar in de UI tonen we euro's. Pas USD_TO_EUR aan als de koers wijzigt.
export const USD_TO_EUR = 0.92

export function toEur(usd: number): number {
  return usd * USD_TO_EUR
}

export function fmtEur(usd: number, decimals = 2): string {
  return `€${(usd * USD_TO_EUR).toFixed(decimals)}`
}
