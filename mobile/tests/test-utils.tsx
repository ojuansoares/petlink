import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react-native'
import { Provider } from 'react-redux'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import uiReducer from '../src/store/slices/uiSlice'
import authReducer from '../src/store/slices/authSlice'
import petsReducer from '../src/store/slices/petsSlice'
import gamificationReducer from '../src/store/slices/gamificationSlice'
import feedingReducer from '../src/store/slices/feedingSlice'

const rootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  pets: petsReducer,
  gamification: gamificationReducer,
  feeding: feedingReducer,
})

type RootState = ReturnType<typeof rootReducer>

function createStore(preloaded?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
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
