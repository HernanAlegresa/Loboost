import {
  COACH_LIST_SCROLL_END_ABOVE_NAV,
  SAFE_BOTTOM_NAV_HEIGHT,
  SAFE_BOTTOM_NAV_PADDING_BOTTOM,
  SAFE_HEADER_PADDING_TOP,
  SAFE_HEADER_PADDING_TOP_COMPACT,
} from '@/lib/ui/safe-area'

describe('safe-area tokens', () => {
  it('routes top spacing through the simulated safe-area variable', () => {
    expect(SAFE_HEADER_PADDING_TOP).toContain('var(--sat, 0px)')
    expect(SAFE_HEADER_PADDING_TOP_COMPACT).toContain('var(--sat, 0px)')
  })

  it('routes bottom spacing through the simulated safe-area variable', () => {
    expect(SAFE_BOTTOM_NAV_HEIGHT).toContain('var(--sab, 0px)')
    expect(SAFE_BOTTOM_NAV_PADDING_BOTTOM).toBe('var(--sab, 0px)')
    expect(COACH_LIST_SCROLL_END_ABOVE_NAV).toContain('var(--sab, 0px)')
  })
})
