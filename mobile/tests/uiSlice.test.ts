import uiReducer, {
  toggleTheme,
  setThemeMode,
  systemThemeChanged,
  showToast,
  dismissToast,
  setOnline,
  setSyncing,
  setShowCreatePost,
  setLoadingPetsForPost,
} from '../src/store/slices/uiSlice'

const initialState: ReturnType<typeof uiReducer> = {
  themeMode: 'light',
  resolvedTheme: 'light',
  toasts: [],
  isOnline: true,
  isSyncing: false,
  showCreatePost: false,
  isLoadingPetsForPost: false,
}

describe('uiSlice', () => {
  it('should return the initial state', () => {
    const state = uiReducer(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      const state = uiReducer(initialState, toggleTheme())
      expect(state.themeMode).toBe('dark')
      expect(state.resolvedTheme).toBe('dark')
    })

    it('should toggle from dark to light', () => {
      const darkState = { ...initialState, themeMode: 'dark' as const, resolvedTheme: 'dark' as const }
      const state = uiReducer(darkState, toggleTheme())
      expect(state.themeMode).toBe('light')
      expect(state.resolvedTheme).toBe('light')
    })
  })

  describe('setThemeMode', () => {
    it('should set to light', () => {
      const state = uiReducer(initialState, setThemeMode('light'))
      expect(state.themeMode).toBe('light')
      expect(state.resolvedTheme).toBe('light')
    })

    it('should set to dark', () => {
      const state = uiReducer(initialState, setThemeMode('dark'))
      expect(state.themeMode).toBe('dark')
      expect(state.resolvedTheme).toBe('dark')
    })
  })

  describe('systemThemeChanged', () => {
    it('should update resolvedTheme when mode is auto', () => {
      const autoState = { ...initialState, themeMode: 'auto' as const, resolvedTheme: 'light' as const }
      const state = uiReducer(autoState, systemThemeChanged('dark'))
      expect(state.resolvedTheme).toBe('dark')
    })

    it('should NOT update resolvedTheme when mode is not auto', () => {
      const state = uiReducer(initialState, systemThemeChanged('dark'))
      expect(state.resolvedTheme).toBe('light')
    })
  })

  describe('toasts', () => {
    it('should add a toast with auto-generated id', () => {
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)
      const state = uiReducer(initialState, showToast({ type: 'success', message: 'Saved!' }))
      expect(state.toasts).toEqual([{ id: String(now), type: 'success', message: 'Saved!' }])
      jest.restoreAllMocks()
    })

    it('should add a toast with optional title', () => {
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)
      const state = uiReducer(initialState, showToast({ type: 'error', title: 'Oops', message: 'Failed' }))
      expect(state.toasts).toEqual([{ id: String(now), type: 'error', title: 'Oops', message: 'Failed' }])
      jest.restoreAllMocks()
    })

    it('should dismiss a toast by id', () => {
      const withToast = {
        ...initialState,
        toasts: [
          { id: '1', type: 'success' as const, message: 'A' },
          { id: '2', type: 'error' as const, message: 'B' },
        ],
      }
      const state = uiReducer(withToast, dismissToast('1'))
      expect(state.toasts).toEqual([{ id: '2', type: 'error', message: 'B' }])
    })
  })

  describe('flags', () => {
    it('setOnline', () => {
      expect(uiReducer(initialState, setOnline(false)).isOnline).toBe(false)
      expect(uiReducer(initialState, setOnline(true)).isOnline).toBe(true)
    })

    it('setSyncing', () => {
      expect(uiReducer(initialState, setSyncing(true)).isSyncing).toBe(true)
    })

    it('setShowCreatePost', () => {
      expect(uiReducer(initialState, setShowCreatePost(true)).showCreatePost).toBe(true)
    })

    it('setLoadingPetsForPost', () => {
      expect(uiReducer(initialState, setLoadingPetsForPost(true)).isLoadingPetsForPost).toBe(true)
    })
  })
})
