import { CredentialsSchema, friendlyAuthError } from './credentials.ts'

describe('CredentialsSchema', () => {
  test('normalizes the email', () => {
    const r = CredentialsSchema.parse({
      email: '  Emily@Example.COM ',
      password: 'longenough',
    })
    expect(r.email).toBe('emily@example.com')
  })
  test('rejects a bad email and a short or huge password', () => {
    expect(
      CredentialsSchema.safeParse({ email: 'nope', password: 'longenough' }).success,
    ).toBe(false)
    expect(
      CredentialsSchema.safeParse({ email: 'a@b.co', password: 'short' }).success,
    ).toBe(false)
    expect(
      CredentialsSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(73) }).success,
    ).toBe(false)
    expect(
      CredentialsSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(72) }).success,
    ).toBe(true)
  })
})

describe('friendlyAuthError', () => {
  test.each([
    ['Invalid login credentials', /do not match/],
    ['User already registered', /already exists/],
    ['Email not confirmed', /confirm your email/],
    ['email rate limit exceeded', /Too many attempts/],
    ['TypeError: Failed to fetch', /Could not reach/],
  ])('%s', (input, expected) => {
    expect(friendlyAuthError(input)).toMatch(expected)
  })
  test('passes unknown messages through', () => {
    expect(friendlyAuthError('Something specific')).toBe('Something specific')
  })
})
