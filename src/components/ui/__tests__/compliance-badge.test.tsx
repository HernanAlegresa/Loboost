import { render, screen } from '@testing-library/react'
import ComplianceBadge from '../compliance-badge'

describe('ComplianceBadge', () => {
  it('shows percentage text for numeric value', () => {
    render(<ComplianceBadge value={87} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('shows "Sin plan" for null value', () => {
    render(<ComplianceBadge value={null} />)
    expect(screen.getByText('Sin plan')).toBeInTheDocument()
  })

  it('uses accent green for value >= 70', () => {
    const { container } = render(<ComplianceBadge value={70} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(181, 242, 61)')
  })

  it('uses warning orange for value = 69 (boundary)', () => {
    const { container } = render(<ComplianceBadge value={69} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 153, 74)')
  })

  it('uses warning orange for value 40-69', () => {
    const { container } = render(<ComplianceBadge value={54} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 153, 74)')
  })

  it('uses error red for value = 39 (boundary)', () => {
    const { container } = render(<ComplianceBadge value={39} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 82, 82)')
  })

  it('uses error red for null (no plan)', () => {
    const { container } = render(<ComplianceBadge value={null} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 82, 82)')
  })
})
