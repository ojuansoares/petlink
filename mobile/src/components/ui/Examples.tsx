import React from 'react'
import { ScrollView, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Card } from './Card'
import { Input } from './Input'
import { Heading, Text } from './Typography'

export default function UiExamples() {
  const { colors } = useTheme()

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        gap: 16,
        backgroundColor: colors.background,
      }}
    >
      <Heading size="3xl" weight="800">
        Organic UI
      </Heading>

      <Text color="mutedForeground">Button variants</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Primary" variant="primary" />
        <Button label="Outline" variant="outline" />
        <Button label="Ghost" variant="ghost" />
      </View>

      <Text color="mutedForeground">Card variants</Text>
      <Card>
        <Text>Default card</Text>
      </Card>
      <Card variant="elevated">
        <Text>Elevated card</Text>
      </Card>
      <Card variant="organic">
        <Text>Organic card</Text>
      </Card>

      <Text color="mutedForeground">Input with icons</Text>
      <Input
        placeholder="Email"
        leftIcon={<Text color="mutedForeground">@</Text>}
        rightIcon={<Text color="mutedForeground">ok</Text>}
      />

      <Text color="mutedForeground">Avatar fallback and image</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Avatar name="Luna Silva" />
        <Avatar
          name="Pipoca"
          source={'https://images.unsplash.com/photo-1517849845537-4d257902454a'}
        />
      </View>
    </ScrollView>
  )
}
