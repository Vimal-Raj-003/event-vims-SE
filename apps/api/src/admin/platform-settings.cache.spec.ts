import { PlatformSettingsCache } from './platform-settings.cache';

describe('PlatformSettingsCache', () => {
  let cache: PlatformSettingsCache<{ value: number }>;

  beforeEach(() => {
    cache = new PlatformSettingsCache(1000); // 1 second TTL for tests
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('any')).toBeUndefined();
  });

  it('returns set value within TTL', () => {
    cache.set('a', { value: 1 });
    expect(cache.get('a')).toEqual({ value: 1 });
  });

  it('returns undefined after TTL expires', () => {
    jest.useFakeTimers();
    cache.set('a', { value: 1 });
    jest.advanceTimersByTime(1100);
    expect(cache.get('a')).toBeUndefined();
    jest.useRealTimers();
  });

  it('invalidate clears the entry', () => {
    cache.set('a', { value: 1 });
    cache.invalidate('a');
    expect(cache.get('a')).toBeUndefined();
  });

  it('clear removes all entries', () => {
    cache.set('a', { value: 1 });
    cache.set('b', { value: 2 });
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
