import { getMissingSecrets } from '../../config/env';

describe('getMissingSecrets', () => {
  it('reports JWT_SECRET when it is unset or blank', () => {
    expect(getMissingSecrets({})).toEqual(['JWT_SECRET']);
    expect(getMissingSecrets({ JWT_SECRET: '   ' })).toEqual(['JWT_SECRET']);
  });

  it('treats the .env.example placeholder as unset', () => {
    expect(getMissingSecrets({ JWT_SECRET: 'your-super-secure-jwt-secret-here' })).toEqual([
      'JWT_SECRET',
    ]);
  });

  it('passes when JWT_SECRET is set', () => {
    expect(getMissingSecrets({ JWT_SECRET: 'a-real-secret' })).toEqual([]);
  });
});
