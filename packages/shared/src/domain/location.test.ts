import { describe, expect, it } from 'vitest';
import { distanceKm, evaluateLocation, roundCoordinate } from './location.js';

const madrid = { center: { lat: 40.4168, lng: -3.7038 }, radiusKm: 25 };

describe('location (BR-39)', () => {
  it('measures Madrid–Valencia at about 300 km', () => {
    expect(Math.round(distanceKm(madrid.center, { lat: 39.4699, lng: -0.3763 }))).toBe(303);
  });

  it('passes inside the radius with good accuracy', () => {
    expect(evaluateLocation({ lat: 40.45, lng: -3.69, accuracyM: 30 }, madrid)).toEqual({
      result: 'PASS',
      distanceKm: 4,
    });
  });

  it('fails outside the radius', () => {
    expect(evaluateLocation({ lat: 39.47, lng: -0.38, accuracyM: 20 }, madrid).result).toBe('FAIL');
  });

  it('accepts exactly 200 m of accuracy and rejects worse readings', () => {
    expect(evaluateLocation({ lat: 40.42, lng: -3.7, accuracyM: 200 }, madrid).result).toBe('PASS');
    expect(evaluateLocation({ lat: 40.42, lng: -3.7, accuracyM: 201 }, madrid).result).toBe(
      'INACCURATE',
    );
  });

  it('rounds coordinates to 2 decimals', () => {
    expect(roundCoordinate(40.41678)).toBe(40.42);
    expect(roundCoordinate(-3.70379)).toBe(-3.7);
  });
});
