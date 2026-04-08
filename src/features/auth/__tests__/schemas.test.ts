import { loginSchema, registerSchema } from '@/features/auth/schemas'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'coach@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })
})

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
      fullName: 'Juan Pérez',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fullName', () => {
    const result = registerSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('fullName')
  })

  it('rejects fullName shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      email: 'coach@example.com',
      password: 'securepass123',
      fullName: 'A',
    })
    expect(result.success).toBe(false)
  })
})
