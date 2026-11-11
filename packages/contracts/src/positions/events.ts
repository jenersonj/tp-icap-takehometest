export const PositionEvents = {
  CHANGED: 'position.changed',
} as const;

export interface PositionChangedEventData {
  book: string;
  symbol: string;
}
