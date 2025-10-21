import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useAuth, AuthProvider } from './useAuth'
import { createTestQueryClient, mockApiResponses } from '../test/setup'
import * as apiModule from '@/services/api'

// Mock the API module
vi.mock('@/services/api', () => ({
  authAPI: {
    login: vi.fn(),
    getProfile: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn()
  }
}))

// Mock localStorage
const mockStorage: { [key: string]: string } = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]) })
}

vi.stubGlobal('localStorage', localStorageMock)

const createWrapper = () => {
  const queryClient = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('useAuth', () => {
  let mockAuthAPI: any

  beforeEach(() => {
    mockAuthAPI = vi.mocked(apiModule.authAPI)
    vi.clearAllMocks()
    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with no user when no token exists', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should fetch user profile when token exists', async () => {
    // Set up existing token
    mockStorage['access_token'] = 'existing-token'
    
    mockAuthAPI.getProfile.mockResolvedValue(mockApiResponses.auth.profile)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockApiResponses.auth.profile)
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockAuthAPI.getProfile).toHaveBeenCalled()
  })

  it.skip('should login successfully with valid credentials', async () => {
    mockAuthAPI.login.mockResolvedValue(mockApiResponses.auth.login)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    // Ensure we start with no user
    expect(result.current.user).toBeNull()

    await act(async () => {
      await result.current.login({ email: 'testuser@example.com', password: 'password123' })
    })

    expect(mockAuthAPI.login).toHaveBeenCalledWith({ email: 'testuser@example.com', password: 'password123' })
    
    // Wait for React state updates to complete
    await waitFor(() => {
      expect(result.current.user).not.toBeNull()
    }, { timeout: 1000 })
    
    expect(result.current.user).toEqual(mockApiResponses.auth.login.user)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'mock-access-token')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token')
  })

  it('should handle login failure', async () => {
    const loginError = new Error('Invalid credentials')
    mockAuthAPI.login.mockRejectedValue(loginError)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await expect(
      act(async () => {
        await result.current.login({ email: 'testuser@example.com', password: 'wrongpassword' })
      })
    ).rejects.toThrow('Invalid credentials')

    expect(result.current.user).toBeNull()
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('should logout and clear tokens', () => {
    // Set up logged in state
    mockStorage['access_token'] = 'some-token'
    mockStorage['refresh_token'] = 'some-refresh-token'

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
  })


  it('should handle profile fetch failure when token exists', async () => {
    mockStorage['access_token'] = 'invalid-token'
    
    mockAuthAPI.getProfile.mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    // Should clear invalid tokens
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
  })

  it('should persist user state across hook re-renders', async () => {
    mockStorage['access_token'] = 'valid-token'
    mockAuthAPI.getProfile.mockResolvedValue(mockApiResponses.auth.profile)

    const { result, rerender } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockApiResponses.auth.profile)
    })

    // Re-render the hook
    rerender()

    // User should still be available
    expect(result.current.user).toEqual(mockApiResponses.auth.profile)
  })

  it('should handle role-based authorization', async () => {
    const adminUser = { ...mockApiResponses.auth.profile, role: 'ADMIN' }
    mockStorage['access_token'] = 'admin-token'
    mockAuthAPI.getProfile.mockResolvedValue(adminUser)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.user).toEqual(adminUser)
      expect(result.current.user?.role).toBe('ADMIN')
    })
  })

  it('should handle store assignment', async () => {
    const storeUser = { ...mockApiResponses.auth.profile, store: 123 }
    mockStorage['access_token'] = 'store-user-token'
    mockAuthAPI.getProfile.mockResolvedValue(storeUser)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.user).toEqual(storeUser)
      expect(result.current.user?.store).toBe(123)
    })
  })

  it('should track loading state correctly', async () => {
    mockStorage['access_token'] = 'valid-token'
    
    // Make getProfile return a pending promise initially
    let resolveProfile: (value: any) => void
    const profilePromise = new Promise(resolve => {
      resolveProfile = resolve
    })
    mockAuthAPI.getProfile.mockReturnValue(profilePromise)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    // Should be loading initially
    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBeNull()

    // Resolve the profile fetch
    act(() => {
      resolveProfile(mockApiResponses.auth.profile)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.user).toEqual(mockApiResponses.auth.profile)
    })
  })
})