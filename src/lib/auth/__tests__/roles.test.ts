import { getUserRole, isCoach, isClient } from '@/lib/auth/roles'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('getUserRole', () => {
  it('returns null when there is no authenticated user', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: jest.fn(),
    } as any)

    const role = await getUserRole()
    expect(role).toBeNull()
  })

  it('returns coach when user profile has role coach', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'coach' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const role = await getUserRole()
    expect(role).toBe('coach')
  })

  it('returns client when user profile has role client', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-456' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'client' },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const role = await getUserRole()
    expect(role).toBe('client')
  })

  it('returns null when profile query fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-789' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'row not found' },
            }),
          }),
        }),
      }),
    } as any)

    const role = await getUserRole()
    expect(role).toBeNull()
  })

  it('returns null when profile does not exist', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-000' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const role = await getUserRole()
    expect(role).toBeNull()
  })
})

describe('isCoach / isClient', () => {
  it('isCoach returns true for coach role', () => {
    expect(isCoach('coach')).toBe(true)
    expect(isCoach('client')).toBe(false)
    expect(isCoach(null)).toBe(false)
  })

  it('isClient returns true for client role', () => {
    expect(isClient('client')).toBe(true)
    expect(isClient('coach')).toBe(false)
    expect(isClient(null)).toBe(false)
  })
})
