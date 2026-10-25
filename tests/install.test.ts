import { describe, expect, it } from 'vitest';
import { isIOS } from '../src/install';

describe('instalar como app', () => {
  it('reconoce iPhone y iPad para explicar cómo instalarlo', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    // Los iPad nuevos dicen ser un Mac, pero tienen pantalla táctil.
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isIOS('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(false);
  });
});
