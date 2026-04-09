import { render, screen } from '@testing-library/react'
import StatCard from '../stat-card'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="CLIENTES" value={12} />)
    expect(screen.getByText('CLIENTES')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders string value', () => {
    render(<StatCard label="ACTIVOS" value="8" />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('uses #F0F0F0 as default value color', () => {
    const { getByTestId } = render(<StatCard label="CLIENTES" value={12} />)
    const valueEl = getByTestId('stat-card-value')
    expect(valueEl.style.color).toBe('rgb(240, 240, 240)')
  })

  it('uses provided valueColor', () => {
    const { getByTestId } = render(
      <StatCard label="ACTIVOS" value={8} valueColor="#B5F23D" />
    )
    const valueEl = getByTestId('stat-card-value')
    expect(valueEl.style.color).toBe('rgb(181, 242, 61)')
  })
})
