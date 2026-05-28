import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useAppDispatch, useAppSelector } from '../../store'
import { selectToasts, dismissToast, selectIsDark } from '../../store/slices/uiSlice'
import { tokens, withAlpha } from '../../theme'

let instanceCounter = 0
let activeInstances: number[] = []
let subscribers = new Set<() => void>()

function notifySubscribers() {
  subscribers.forEach((fn) => fn())
}

/**
 * AppToast Component.
 * Colocado avulso para permitir ser renderizado dentro de <Modal>s que caso contrario
 * teriam um z-index nativo maior que o toast root.
 * Possui logica inteligente para exibir apenas a instancia mais alta.
 */
export function AppToast() {
  const dispatch = useAppDispatch()
  const toasts = useAppSelector(selectToasts)
  const isDark = useAppSelector(selectIsDark)
  const palette = isDark ? tokens.dark : tokens.light

  const [instanceId] = useState(() => ++instanceCounter)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const handleUpdate = () => forceUpdate((n) => n + 1)
    subscribers.add(handleUpdate)
    
    activeInstances.push(instanceId)
    notifySubscribers()

    return () => {
      subscribers.delete(handleUpdate)
      activeInstances = activeInstances.filter((id) => id !== instanceId)
      notifySubscribers()
    }
  }, [instanceId])

  useEffect(() => {
    if (toasts.length === 0) return

    const activeToast = toasts[0]
    const timer = setTimeout(() => {
      dispatch(dismissToast(activeToast.id))
    }, 3500)

    return () => clearTimeout(timer)
  }, [toasts, dispatch])

  // Apenas a instancia mais acima (ultimo mounted) processa e exibe  
  const isTopInstance = activeInstances.length === 0 || instanceId === Math.max(...activeInstances)
  
  if (!isTopInstance) return null
  if (toasts.length === 0) return null

  return (
    <View style={styles.toastContainer} pointerEvents="none">
      {toasts.map((toast, index) => {
        if (index > 0) return null
        const isError = toast.type === 'error'
        const bgColor = isError ? palette.destructive : palette.primary
        const fgColor = isError ? palette.destructiveForeground : palette.primaryForeground
        const title = toast.title ?? (isError ? 'Erro' : undefined)
        const showLoader = toast.type === 'info'

        return (
          <View
            key={toast.id}
            style={[
              styles.toastBox,
              {
                backgroundColor: bgColor,
                borderColor: withAlpha(palette.border, 0.9),
              },
            ]}
          >
            {showLoader && <ActivityIndicator size="small" color={fgColor} style={styles.toastSpinner} />}
            <View style={styles.toastTextWrapper}>
              {title && <Text style={[styles.toastTitle, { color: fgColor }]}>{title}</Text>}
              <Text style={[styles.toastMessage, { color: fgColor }]}>{toast.message}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 58,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBox: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastSpinner: {
    marginRight: 10,
  },
  toastTextWrapper: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
})
