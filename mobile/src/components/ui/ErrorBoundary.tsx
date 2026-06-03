import React, { Component, type ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Typography'
import { tokens, withAlpha } from '../../theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={styles.container}>
        <Ionicons name="bug-outline" size={48} color={tokens.colors.mutedForeground} />
        <Text weight="700" size="lg" style={{ marginTop: 16 }}>
          Algo deu errado
        </Text>
        <Text size="sm" color="mutedForeground" style={{ textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          Ocorreu um erro inesperado na tela. Pedimos desculpas pelo inconveniente.
        </Text>
        <Pressable
          onPress={this.handleRetry}
          style={({ pressed }) => ([
            styles.button,
            { opacity: pressed ? 0.8 : 1 },
          ])}
        >
          <Text weight="700" size="sm" style={{ color: '#fff' }}>
            Tentar novamente
          </Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: tokens.colors.background,
  },
  button: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
})
