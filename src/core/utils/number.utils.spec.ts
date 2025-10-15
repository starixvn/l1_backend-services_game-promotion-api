import { roundToTwoDecimals, roundToFourDecimals, calculatePercentage } from './number.utils';

describe('Number Utils', () => {
  describe('roundToTwoDecimals', () => {
    it('should round to 2 decimal places', () => {
      expect(roundToTwoDecimals(1.234)).toBe(1.23);
      expect(roundToTwoDecimals(1.235)).toBe(1.24);
      expect(roundToTwoDecimals(1.999)).toBe(2.0);
    });

    it('should handle zero', () => {
      expect(roundToTwoDecimals(0)).toBe(0);
    });

    it('should handle null/undefined as 0', () => {
      expect(roundToTwoDecimals(null as any)).toBe(0);
      expect(roundToTwoDecimals(undefined as any)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(roundToTwoDecimals(-1.234)).toBe(-1.23);
      expect(roundToTwoDecimals(-1.235)).toBe(-1.24);
    });
  });

  describe('roundToFourDecimals', () => {
    it('should round to 4 decimal places', () => {
      expect(roundToFourDecimals(1.23456)).toBe(1.2346);
      expect(roundToFourDecimals(1.23454)).toBe(1.2345);
      expect(roundToFourDecimals(1.99999)).toBe(2.0);
    });

    it('should handle zero', () => {
      expect(roundToFourDecimals(0)).toBe(0);
    });

    it('should handle null/undefined as 0', () => {
      expect(roundToFourDecimals(null as any)).toBe(0);
      expect(roundToFourDecimals(undefined as any)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(roundToFourDecimals(-1.23456)).toBe(-1.2346);
      expect(roundToFourDecimals(-1.23454)).toBe(-1.2345);
    });

    describe('Floating Point Precision Edge Cases', () => {
      it('should handle floating point number ending with .99999993', () => {
        // Common floating point precision issue
        expect(roundToFourDecimals(49.99999993)).toBe(50.0);
        expect(roundToFourDecimals(99.99999993)).toBe(100.0);
        expect(roundToFourDecimals(1.99999993)).toBe(2.0);
      });

      it('should handle very small floating point number .000000000003', () => {
        // Very tiny number should round to 0 at 4 decimals
        expect(roundToFourDecimals(0.000000000003)).toBe(0);
        expect(roundToFourDecimals(0.00001)).toBe(0.0);
        expect(roundToFourDecimals(0.000056)).toBe(0.0001);
      });

      it('should handle multiplication result with floating point errors', () => {
        // JavaScript floating point: 0.1 + 0.2 = 0.30000000000000004
        const result = 0.1 + 0.2;
        expect(result).not.toBe(0.3); // Floating point issue
        expect(roundToFourDecimals(result)).toBe(0.3); // Fixed by rounding
      });

      it('should handle division result with floating point errors', () => {
        // Division can produce long decimals
        const result = 10 / 3; // 3.3333333333333335
        expect(roundToFourDecimals(result)).toBe(3.3333);
      });

      it('should handle multiplication with turnover multipliers', () => {
        // Simulating actual use case: winAmount * multiplier
        const winAmount = 33.33333333;
        const multiplier = 3.0;
        const result = winAmount * multiplier; // 99.99999999
        expect(roundToFourDecimals(result)).toBe(100.0);
      });

      it('should handle multiplication with slight precision errors', () => {
        // Multiplier with precision error
        const winAmount = 50;
        const multiplier = 2.0000001;
        const result = winAmount * multiplier; // 100.00000005
        expect(roundToFourDecimals(result)).toBe(100.0);
      });

      it('should preserve precision within 4 decimals', () => {
        expect(roundToFourDecimals(1.2345)).toBe(1.2345);
        expect(roundToFourDecimals(99.9999)).toBe(99.9999);
        expect(roundToFourDecimals(0.0001)).toBe(0.0001);
      });

      it('should handle edge case close to rounding boundary', () => {
        // Numbers right at the boundary of rounding up or down
        expect(roundToFourDecimals(1.23445)).toBe(1.2345); // Rounds down
        expect(roundToFourDecimals(1.23455)).toBe(1.2346); // Rounds up
        expect(roundToFourDecimals(99.99995)).toBe(99.9999); // Rounds to 4 decimals
        expect(roundToFourDecimals(99.999999)).toBe(100.0); // This will round up to 100
      });

      it('should handle very large numbers with floating point precision', () => {
        expect(roundToFourDecimals(1000000.99999993)).toBe(1000001.0);
        expect(roundToFourDecimals(9999999.12345678)).toBe(9999999.1235);
      });

      it('should handle negative floating point numbers', () => {
        expect(roundToFourDecimals(-49.99999993)).toBe(-50.0);
        expect(roundToFourDecimals(-0.000000000003)).toBe(-0.0);
        expect(roundToFourDecimals(-99.99995)).toBe(-99.9999); // Rounds to 4 decimals
        expect(roundToFourDecimals(-99.999999)).toBe(-100.0); // This will round up to -100
      });

      it('should handle subtraction with floating point precision', () => {
        // Common in remainingTO calculation
        const minRequired = 100.00000005;
        const totalTurnover = 50;
        const remaining = minRequired - totalTurnover; // 50.00000005
        expect(roundToFourDecimals(remaining)).toBe(50.0);
      });

      it('should handle JavaScript floating point quirks', () => {
        // Classic JavaScript floating point issues
        expect(roundToFourDecimals(0.1 + 0.1 + 0.1)).toBe(0.3);
        expect(roundToFourDecimals(0.3 - 0.2)).toBe(0.1);
        expect(roundToFourDecimals(0.2 * 0.2)).toBe(0.04);
      });
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(33.33, 100)).toBe(33.33);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('should round result to 2 decimals', () => {
      expect(calculatePercentage(1, 3)).toBe(33.33);
      expect(calculatePercentage(2, 3)).toBe(66.67);
    });

    it('should handle floating point precision in percentage calculation', () => {
      expect(calculatePercentage(99.99999993, 100)).toBe(100);
      expect(calculatePercentage(66.6666666, 100)).toBe(66.67);
    });
  });
});
