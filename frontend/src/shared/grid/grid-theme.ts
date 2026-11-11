import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid's Quartz theme fed from the shadcn colour tokens, so the grid follows the light and
 * dark theme with no second palette. Dense rows and tabular numbers suit a blotter.
 */
export const gridTheme = themeQuartz.withParams({
  backgroundColor: 'var(--background)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  chromeBackgroundColor: 'var(--muted)',
  headerBackgroundColor: 'var(--muted)',
  headerTextColor: 'var(--muted-foreground)',
  oddRowBackgroundColor: 'color-mix(in oklch, var(--muted) 45%, transparent)',
  rowHoverColor: 'color-mix(in oklch, var(--accent) 80%, transparent)',
  selectedRowBackgroundColor: 'color-mix(in oklch, var(--primary) 10%, transparent)',
  accentColor: 'var(--ring)',
  valueChangeValueHighlightBackgroundColor: 'oklch(0.82 0.16 85 / 45%)',
  fontFamily: 'inherit',
  fontSize: 12,
  headerFontSize: 11,
  headerFontWeight: 600,
  spacing: 4,
  cellHorizontalPadding: 8,
  rowHeight: 28,
  headerHeight: 30,
  wrapperBorderRadius: 0,
  wrapperBorder: false,
  browserColorScheme: 'inherit',
});
