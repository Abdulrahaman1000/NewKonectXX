/**
 * Format helpers.
 */

export const formatNaira = (amount: number): string =>
  `₦${amount.toLocaleString('en-NG')}`;

export const formatPercent = (decimal: number): string => `${Math.round(decimal * 100)}%`;

export const calculateSavings = (original: number, current: number) => {
  const saving = original - current;
  const percent = original > 0 ? Math.round((saving / original) * 100) : 0;
  return { saving, percent };
};
