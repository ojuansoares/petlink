import { Platform } from 'react-native'

/**
 * Hook centralizado para comportamento de teclado em modais bottom-sheet.
 * Use as props retornadas no KeyboardAvoidingView de qualquer modal.
 *
 * Regra universal:
 *   iOS  → behavior="padding"  (empurra o conteúdo para cima suavemente)
 *   Android → behavior="height" + windowSoftInputMode ajustResize via app.json
 *
 * Na prática, para evitar o tremor no Android, usamos undefined no Android
 * e deixamos o Modal com statusBarTranslucent cuidar do espaço.
 */
export function useBottomSheet() {
  const keyboardBehavior: 'padding' | 'height' | 'position' | undefined = Platform.OS === 'ios' ? 'padding' : undefined

  return {
    keyboardBehavior,
    // Props padrão para o KeyboardAvoidingView do modal
    keyboardAvoidingProps: {
      behavior: keyboardBehavior,
      keyboardVerticalOffset: 0,
      style: { flex: 1 },
    } as const,
  }
}