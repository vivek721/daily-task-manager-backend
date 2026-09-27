import { isValidEmail, MAX_EMAIL_LENGTH } from '../../utils/email';

describe('isValidEmail', () => {
  it.each([
    'user@example.com',
    'first.last+tag@sub.example.co.uk',
    'a@b.c',
    'user_name@example-domain.io',
  ])('accepts %s', email => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['no @', 'user.example.com'],
    ['two @', 'user@@example.com'],
    ['@ in domain', 'user@exa@mple.com'],
    ['empty local part', '@example.com'],
    ['empty domain', 'user@'],
    ['domain without a dot', 'user@localhost'],
    ['domain starting with a dot', 'user@.example.com'],
    ['domain ending with a dot', 'user@example.com.'],
    ['domain that is only a dot', 'user@.'],
    ['space', 'user name@example.com'],
    ['tab', 'user@example.\tcom'],
    ['newline', 'user@example.com\n'],
  ])('rejects %s', (_label, email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it.each([undefined, null, 42, {}, ['a@b.c']])('rejects non-string %p', value => {
    expect(isValidEmail(value)).toBe(false);
  });

  it('enforces the length limit', () => {
    const domain = '@example.com';
    const atLimit = 'a'.repeat(MAX_EMAIL_LENGTH - domain.length) + domain;
    expect(isValidEmail(atLimit)).toBe(true);
    expect(isValidEmail(`a${atLimit}`)).toBe(false);
  });

  it('handles inputs that made the old regex backtrack in linear time', () => {
    // Long runs without the expected '@' / '.' structure were the ReDoS trigger
    const inputs = [
      'a'.repeat(100_000),
      `a@${'a'.repeat(100_000)}`,
      `${'@'.repeat(50_000)}.`,
      `a@${'a.'.repeat(50_000)} `,
    ];

    const start = Date.now();
    for (const input of inputs) {
      expect(isValidEmail(input)).toBe(false);
    }
    expect(Date.now() - start).toBeLessThan(100);
  });
});
