/** Per-symbol totals over ACTIVE trades, as the GROUP BY returns them. */
export interface PositionTotals {
  symbol: string;
  buyQuantity: number;
  /** Sum of quantity x price over BUY trades. */
  buyNotional: number;
  sellQuantity: number;
  sellNotional: number;
  tradeCount: number;
}

export interface PositionValuation {
  /** Signed: BUY adds, SELL subtracts. */
  netQuantity: number;
  /** Average price of the open quantity; null when flat. */
  averagePrice: number | null;
  marketValue: number | null;
  unrealisedPnl: number | null;
  realisedPnl: number;
}

/**
 * Values a position with the average-cost method, which needs only the GROUP BY totals and
 * not the trade order: buys and sells are each averaged, the matched quantity
 * (min of bought and sold) is realised at (average sell - average buy), and the open
 * quantity carries the average price of the side that is left.
 *
 * `lastPrice` undefined means no market price yet: market value and unrealised P&L are null.
 */
export function valuePosition(totals: PositionTotals, lastPrice?: number): PositionValuation {
  const avgBuy = totals.buyQuantity > 0 ? totals.buyNotional / totals.buyQuantity : 0;
  const avgSell = totals.sellQuantity > 0 ? totals.sellNotional / totals.sellQuantity : 0;
  const matched = Math.min(totals.buyQuantity, totals.sellQuantity);
  const realisedPnl = matched > 0 ? matched * (avgSell - avgBuy) : 0;

  const netQuantity = totals.buyQuantity - totals.sellQuantity;
  const averagePrice = netQuantity > 0 ? avgBuy : netQuantity < 0 ? avgSell : null;

  const priced = lastPrice !== undefined;
  return {
    netQuantity,
    averagePrice,
    marketValue: priced ? netQuantity * lastPrice : null,
    unrealisedPnl: !priced
      ? null
      : averagePrice === null
        ? 0
        : netQuantity * (lastPrice - averagePrice),
    realisedPnl,
  };
}

/** Fixed decimal places without trailing zeros, and never "-0". */
export function formatDecimal(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}
