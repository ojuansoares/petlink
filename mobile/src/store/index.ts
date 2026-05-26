import { configureStore } from '@reduxjs/toolkit'
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
  },
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