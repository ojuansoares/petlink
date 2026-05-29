import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { setApiAuthHandlers } from '../api/axios'

import authReducer, { logout, setTokens } from './slices/authSlice'
import profileReducer    from './slices/profileSlice'
import petsReducer       from './slices/petsSlice'
import postsReducer      from './slices/postsSlice'
import locationsReducer  from './slices/locationsSlices'
import walksReducer      from './slices/walksSlices'
import notificationsReducer from './slices/notificationsSlice'
import uiReducer         from './slices/uiSlice'
import followsReducer    from './slices/followsSlice'
import likesReducer      from './slices/likesSlice'
import commentsReducer   from './slices/commentsSlice'
import commentLikesReducer from './slices/commentLikesSlice'
import feedingReducer from './slices/feedingSlice'
import groupsReducer from './slices/groupsSlice'
import gamificationReducer, { fetchGamificationThunk } from './slices/gamificationSlice'

const xpListener = createListenerMiddleware()

xpListener.startListening({
  predicate: (action: any) =>
    action.type === 'posts/createPost/fulfilled' ||
    action.type === 'pets/createPet/fulfilled' ||
    action.type === 'feeding/checkMeal/fulfilled' ||
    action.type === 'groups/join/fulfilled' ||
    action.type === 'groups/create/fulfilled',
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(fetchGamificationThunk())
  },
})

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    profile:       profileReducer,
    pets:          petsReducer,
    posts:         postsReducer,
    locations:     locationsReducer,
    walks:         walksReducer,
    notifications: notificationsReducer,
    ui:            uiReducer,
    follows:       followsReducer,
    likes:         likesReducer,
    comments:      commentsReducer,
    commentLikes:  commentLikesReducer,
    feeding:       feedingReducer,
    groups:        groupsReducer,
    gamification:  gamificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(xpListener.middleware),
})

setApiAuthHandlers({
  onTokenRefresh: (accessToken) => {
    store.dispatch(setTokens({ accessToken }))
  },
  onAuthFailure: () => {
    store.dispatch(logout())
  },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Hooks tipados — use esses no lugar do useDispatch/useSelector padrão
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector