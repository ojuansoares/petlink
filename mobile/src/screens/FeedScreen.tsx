import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from '../components/ui/Typography'

export default function FeedScreen() {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Heading size="2xl" weight="800">Feed</Heading>
      <Text color="mutedForeground">Aba de feed em construcao.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 122,
  },
})
