import { render, screen } from '@testing-library/react'
import Avatar from '../avatar'

describe('Avatar', () => {
  it('extracts initials from first and last name', () => {
    render(<Avatar fullName="Sofía Torres" />)
    expect(screen.getByText('ST')).toBeInTheDocument()
  })

  it('uses single letter for one-word name', () => {
    render(<Avatar fullName="Hernán" />)
    expect(screen.getByText('H')).toBeInTheDocument()
  })

  it('returns ? for empty string', () => {
    render(<Avatar fullName="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('extracts first and last of multi-word name', () => {
    render(<Avatar fullName="Juan Carlos Pérez López" />)
    expect(screen.getByText('JL')).toBeInTheDocument()
  })

  it('renders sm size at 28px', () => {
    const { container } = render(<Avatar fullName="AB" size="sm" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('28px')
    expect(el.style.height).toBe('28px')
  })

  it('renders md size at 40px (default)', () => {
    const { container } = render(<Avatar fullName="AB" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('40px')
    expect(el.style.height).toBe('40px')
  })

  it('renders lg size at 52px', () => {
    const { container } = render(<Avatar fullName="AB" size="lg" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('52px')
    expect(el.style.height).toBe('52px')
  })
})
