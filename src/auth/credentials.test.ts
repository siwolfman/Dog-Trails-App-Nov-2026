import {
  LoginSchema,
  PASSWORD_RULES,
  PASSWORD_SUMMARY,
  PasswordSchema,
  SignupSchema,
  friendlyAuthError,
} from './credentials.ts'

const STRONG = 'Biscuit-Walk9'

describe('SignupSchema', () => {
  test('normalizes the email', () => {
    const r = SignupSchema.parse({ email: '  Emily@Example.COM ', password: STRONG })
    expect(r.email).toBe('emily@example.com')
  })

  test('rejects a bad email', () => {
    expect(SignupSchema.safeParse({ email: 'nope', password: STRONG }).success).toBe(
      false,
    )
  })
})

describe('PasswordSchema matches the Supabase password rules', () => {
  // The live project says: at least 8 characters, and one each of lowercase, uppercase, digit, symbol.
  test.each([
    ['Biscuit-Walk9', true],
    ['Ab1!Ab1!', true], // exactly 8
    ['Ab1!Ab1', false], // 7 characters
    ['password1', false], // no uppercase, no symbol
    ['Password1', false], // no symbol
    ['Password!', false], // no number
    ['PASSWORD1!', false], // no lowercase
    ['password1!', false], // no uppercase
    ['correct horse', false], // no upper, number or symbol
    ['Correct horse 9 !', true], // spaces are fine
    ['A1!' + 'a'.repeat(69), true], // 72 characters
    ['A1!' + 'a'.repeat(70), false], // 73 characters
  ])('%s', (password, ok) => {
    expect(PasswordSchema.safeParse(password).success).toBe(ok)
  })

  test('says exactly what is missing', () => {
    const r = PasswordSchema.safeParse('password')
    expect(r.error?.issues[0]?.message).toBe(
      'Your password still needs an uppercase letter, a number and a symbol such as ! or ?.',
    )
    expect(PasswordSchema.safeParse('Ab1!').error?.issues[0]?.message).toBe(
      'Your password still needs at least 8 characters.',
    )
  })

  test('every symbol Supabase lists counts', () => {
    const symbols = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'
    for (const c of symbols)
      expect(PasswordSchema.safeParse(`Abcdef1${c}`).success, c).toBe(true)
  })

  test('the summary text names every rule', () => {
    expect(PASSWORD_RULES).toHaveLength(5)
    for (const word of ['8 characters', 'lowercase', 'uppercase', 'number', 'symbol'])
      expect(PASSWORD_SUMMARY).toContain(word)
  })
})

describe('LoginSchema', () => {
  test('does not apply the strength rules, so older accounts can still log in', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.co', password: 'old' }).success).toBe(true)
    expect(LoginSchema.safeParse({ email: 'a@b.co', password: 'doggyapp' }).success).toBe(
      true,
    )
  })
  test('still needs an email and some password', () => {
    expect(LoginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
    expect(
      LoginSchema.safeParse({ email: 'a@b.co', password: '' }).error?.issues[0]?.message,
    ).toBe('Enter your password.')
  })
})

describe('friendlyAuthError', () => {
  test.each([
    ['Invalid login credentials', /do not match/],
    ['User already registered', /already exists/],
    ['Email not confirmed', /confirm your email/],
    ['email rate limit exceeded', /Too many attempts/],
    ['TypeError: Failed to fetch', /Could not reach/],
    [
      'New password should be different from the old password.',
      /not used for this account/,
    ],
  ])('%s', (input, expected) => {
    expect(friendlyAuthError(input)).toMatch(expected)
  })

  test("turns Supabase's real weak-password message into plain language", () => {
    // Captured from the live project's sign-up endpoint.
    const live =
      'Password should be at least 8 characters. Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~.'
    expect(friendlyAuthError(live)).toBe(`That password is too weak. ${PASSWORD_SUMMARY}`)
    expect(
      friendlyAuthError(
        'Password is known to be weak and easy to guess, please choose a different one.',
      ),
    ).toMatch(/too weak/)
  })

  test('passes unknown messages through', () => {
    expect(friendlyAuthError('Something specific')).toBe('Something specific')
  })
})
