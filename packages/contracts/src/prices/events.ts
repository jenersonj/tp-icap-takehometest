export const PriceEvents = {
  TICKED: 'prices.ticked',
} as const;

export interface PricesTickedEventData {
  symbols: string[];
  asOf: string;
}
