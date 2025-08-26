/**
 * Utility functions for number formatting and calculations
 */

/**
 * Rounds a number to 2 decimal places
 * @param value - The number to round
 * @returns Rounded number to 2 decimal places
 */
export function roundToTwoDecimals(value: number): number {
  return Number((value || 0).toFixed(2));
}

/**
 * Calculates percentage and rounds to 2 decimal places
 * @param part - The part value
 * @param total - The total value
 * @returns Percentage rounded to 2 decimal places
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return roundToTwoDecimals((part / total) * 100);
}
