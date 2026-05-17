import { describe, it, expect } from 'vitest';
import { distanceMeters } from '../locationService';

describe('locationService', () => {
  describe('distanceMeters', () => {
    it('should return 0 for same coordinates', () => {
      expect(distanceMeters(-6.2, 106.8, -6.2, 106.8)).toBe(0);
    });

    it('should compute approximate distance between two points', () => {
      const dist = distanceMeters(-6.2, 106.8, -6.21, 106.81);
      expect(dist).toBeGreaterThan(1000);
      expect(dist).toBeLessThan(2000);
    });
  });
});
