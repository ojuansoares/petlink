import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { useAppDispatch } from '../../store'
import { setShowCreatePost, setLoadingPetsForPost } from '../../store/slices/uiSlice'
import { fetchPetsThunk } from '../../store/slices/petsSlice'

export function CreatePostFAB() {
  const dispatch = useAppDispatch()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const handlePress = async () => {
    dispatch(setLoadingPetsForPost(true))
    dispatch(setShowCreatePost(true))
    try {
      await dispatch(fetchPetsThunk()).unwrap()
    } finally {
      dispatch(setLoadingPetsForPost(false))
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.fab,
        {
          backgroundColor: colors.primary,
          bottom: insets.bottom + 88,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Criar post"
    >
      <Ionicons name="add" size={28} color={colors.primaryForeground} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
})
