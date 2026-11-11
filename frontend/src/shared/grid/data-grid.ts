import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community';

export { gridTheme } from './grid-theme';

// One registration for every grid in the app (idempotent).
ModuleRegistry.registerModules([AllCommunityModule]);

/** Column defaults shared by the blotter and positions grids. */
export const defaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  suppressHeaderMenuButton: true,
};

/** Wrapper class: fill the parent and use tabular figures for aligned numbers. */
export const gridContainerClass = 'h-full w-full tabular-nums';
