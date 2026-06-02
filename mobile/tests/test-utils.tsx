import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react-native'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import uiReducer from '../src/store/slices/uiSlice'
import authReducer from '../src/store/slices/authSlice'
import petsReducer from '../src/store/slices/petsSlice'
import gamificationReducer from '../src/store/slices/gamificationSlice'
import feedingReducer from '../src/store/slices/feedingSlice'

type RootState = ReturnType<typeof createStore.getState>

function createStore(preloaded?: Partial<RootState>) {
  return configureStore({
    reducer: {
      ui: uiReducer,
      auth: authReducer,
      pets: petsReducer,
      gamification: gamificationReducer,
      feeding: feedingReducer,
    },
    preloadedState: preloaded as any,
  })
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>
}

function renderWithProviders(ui: ReactElement, { preloadedState, ...renderOptions }: Options = {}) {
  const store = createStore(preloadedState)
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store }
}

export { renderWithProviders, createStore }
