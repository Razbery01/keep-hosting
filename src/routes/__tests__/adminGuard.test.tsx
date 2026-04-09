import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireAdmin from '../../components/auth/RequireAdmin'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))
import { useAuth } from '../../hooks/useAuth'

const mockUseAuth = vi.mocked(useAuth)

function renderGuard(initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>home-page</div>} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<div>admin-dashboard</div>} />
          <Route path="/admin/orders" element={<div>admin-orders</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAdmin route guard', () => {
  it('redirects a non-admin user away from /admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' } as any,
      profile: { id: 'u1', email: 'x@y.z', full_name: null, phone: null, role: 'client' },
      loading: false,
      signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), isAdmin: false,
    } as any)

    renderGuard('/admin')
    expect(screen.queryByText('admin-dashboard')).toBeNull()
    expect(screen.getByText('home-page')).toBeInTheDocument()
  })

  it('redirects a non-admin user away from /admin/orders', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' } as any,
      profile: { id: 'u1', email: 'x@y.z', full_name: null, phone: null, role: 'client' },
      loading: false,
      signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), isAdmin: false,
    } as any)

    renderGuard('/admin/orders')
    expect(screen.queryByText('admin-orders')).toBeNull()
    expect(screen.getByText('home-page')).toBeInTheDocument()
  })

  it('redirects an unauthenticated user away from /admin', () => {
    mockUseAuth.mockReturnValue({
      user: null, profile: null, loading: false,
      signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), isAdmin: false,
    } as any)

    renderGuard('/admin')
    expect(screen.queryByText('admin-dashboard')).toBeNull()
    expect(screen.getByText('home-page')).toBeInTheDocument()
  })

  it('renders the child route for an admin user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' } as any,
      profile: { id: 'u1', email: 'admin@y.z', full_name: null, phone: null, role: 'admin' },
      loading: false,
      signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), isAdmin: true,
    } as any)

    renderGuard('/admin')
    expect(screen.getByText('admin-dashboard')).toBeInTheDocument()
  })

  it('renders nothing while loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, profile: null, loading: true,
      signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), isAdmin: false,
    } as any)

    const { container } = renderGuard('/admin')
    expect(screen.queryByText('admin-dashboard')).toBeNull()
    expect(screen.queryByText('home-page')).toBeNull()
    expect(container.firstChild).toBeNull()
  })
})
