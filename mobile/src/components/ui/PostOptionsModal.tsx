import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Share,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library'
import { Paths, File } from 'expo-file-system'
import { useTheme } from '../../hooks/useTheme'
import { AppToast } from './AppToast'
import { useNetworkCheck } from '../../hooks/useNetworkCheck'
import { useAppDispatch } from '../../store'
import { deletePostThunk, togglePinThunk, updatePostThunk, Post } from '../../store/slices/postsSlice'
import { showToast } from '../../store/slices/uiSlice'
import { Button } from './Button'
import { Input } from './Input'
import { OptionSelect } from './OptionSelect'
import { Heading, Text } from './Typography'
import { BRAZIL_STATES } from '../../constants/brazilStates'

interface PostOptionsModalProps {
  post: Post
  visible: boolean
  onClose: () => void
  isOwnPost: boolean
  context?: 'feed' | 'profile'
}

export function PostOptionsModal({ post, visible, onClose, isOwnPost, context = 'feed' }: Readonly<PostOptionsModalProps>) {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const { isOnline } = useNetworkCheck()
  const insets = useSafeAreaInsets()

  const requireOnline = (action: () => void) => {
    if (!isOnline) {
      dispatch(showToast({ type: 'error', message: 'Sem internet. Conecte-se para continuar.' }))
      return
    }
    action()
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [caption, setCaption] = useState(post.caption || '')
  const [location, setLocation] = useState(post.location || '')
  const [isPinning, setIsPinning] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const locationOptions = React.useMemo(() => {
    if (!location) return BRAZIL_STATES
    const alreadyExists = BRAZIL_STATES.some((item) => item.value === location)
    if (alreadyExists) return BRAZIL_STATES
    return [{ label: `Atual: ${location}`, value: location }, ...BRAZIL_STATES]
  }, [location])

  const handleShare = async () => {
    try {
      await Share.share({ message: `Olha esse post de ${post.pets?.name || 'um pet'}: ${post.image_url}` })
      onClose()
    } catch {
      dispatch(showToast({ type: 'error', message: 'Erro ao compartilhar' }))
    }
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        dispatch(showToast({ type: 'error', message: 'Permissão necessária para salvar na galeria' }))
        return
      }
      dispatch(showToast({ type: 'info', message: 'Salvando imagem...' }))
      const dest = new File(Paths.cache, `petlink-post-${post.id}.jpg`)
      const file = await File.downloadFileAsync(post.image_url, dest)
      await MediaLibrary.createAssetAsync(file.uri)
      dispatch(showToast({ type: 'success', message: 'Imagem salva na galeria!' }))
      onClose()
    } catch (error: any) {
      console.error('[handleDownload] Error:', error)
      dispatch(showToast({ type: 'error', message: 'Erro ao baixar imagem' }))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleTogglePin = async () => {
    requireOnline(async () => {
      try {
        setIsPinning(true)
        await dispatch(togglePinThunk(post.id)).unwrap()
        dispatch(showToast({ type: 'success', message: post.is_pinned ? 'Post desfixado' : 'Post fixado com sucesso' }))
        onClose()
      } catch (error: any) {
        console.error('[handleTogglePin] Error:', error)
        dispatch(showToast({ type: 'error', message: 'Não foi possível fixar o post no momento' }))
      } finally {
        setIsPinning(false)
      }
    })
  }

  const handleDelete = async () => {
    requireOnline(async () => {
      try {
        await dispatch(deletePostThunk(post.id)).unwrap()
        dispatch(showToast({ type: 'success', message: 'Post excluído' }))
        setDeleteConfirmOpen(false)
        onClose()
      } catch (error: any) {
        console.error('[handleDelete] Error:', error)
        dispatch(showToast({ type: 'error', message: 'Erro ao excluir publicação' }))
      }
    })
  }

  const handleUpdate = async () => {
    requireOnline(async () => {
      try {
        setIsUpdating(true)
        await dispatch(updatePostThunk({ postId: post.id, patch: { caption, location } })).unwrap()
        dispatch(showToast({ type: 'success', message: 'Post atualizado' }))
        setEditOpen(false)
        onClose()
      } catch (error: any) {
        console.error('[handleUpdate] Error:', error)
        dispatch(showToast({ type: 'error', message: 'Não foi possível atualizar a publicação' }))
      } finally {
        setIsUpdating(false)
      }
    })
  }

  // ─── Modal de edição — mesmo padrão do Login ───────────────────────────────
  if (editOpen) {
    return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setEditOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: Math.max(insets.bottom, 24),
                },
              ]}
            >
              <AppToast />
              <View style={styles.sheetHandle}>
                <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
              </View>
              <View style={styles.header}>
                <Heading size="lg" weight="800">Editar Publicação</Heading>
                <Pressable onPress={() => setEditOpen(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
              >
                <Input
                  label="Legenda"
                  placeholder="Escreva uma legenda..."
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                />
                <OptionSelect
                  label="Localização"
                  placeholder="Selecionar estado..."
                  value={location}
                  onChange={setLocation}
                  options={locationOptions}
                  leftIconName="location-outline"
                />
                <Button
                  label="Salvar alterações"
                  onPress={handleUpdate}
                  loading={isUpdating}
                  disabled={isUpdating}
                  style={{ marginTop: 16 }}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  // ─── Modal de confirmação de exclusão ──────────────────────────────────────
  if (deleteConfirmOpen) {
    return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setDeleteConfirmOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeleteConfirmOpen(false)} />
          <AppToast />
          <View style={[styles.confirmSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>
            <View style={styles.confirmBody}>
              <View style={[styles.confirmIcon, { backgroundColor: withAlpha(colors.destructive, 0.1) }]}>
                <Ionicons name="warning" size={32} color={colors.destructive} />
              </View>
              <Heading size="lg" weight="800" style={styles.dialogTitle}>Excluir publicação?</Heading>
              <Text color="mutedForeground" style={styles.dialogDesc}>
                Esta ação não pode ser desfeita. A publicação será permanentemente removida.
              </Text>
              <View style={styles.dialogActions}>
                <Button label="Cancelar" variant="outline" onPress={() => setDeleteConfirmOpen(false)} style={{ flex: 1 }} />
                <Button label="Excluir" style={{ flex: 1, backgroundColor: colors.destructive }} onPress={handleDelete} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  // ─── Sheet de opções principal ─────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <AppToast />
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHandle}>
            <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
          </View>

          <View style={styles.optionsList}>
            {isOwnPost && (
              <Pressable
                style={[styles.optionItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setCaption(post.caption || '')
                  setLocation(post.location || '')
                  setEditOpen(true)
                }}
              >
                <Ionicons name="create-outline" size={22} color={colors.foreground} />
                <Text size="base" weight="600" style={styles.optionText}>Editar</Text>
              </Pressable>
            )}

            {isOwnPost && context === 'profile' && (
              <Pressable
                style={[styles.optionItem, { borderBottomColor: colors.border }]}
                onPress={handleTogglePin}
                disabled={isPinning}
              >
                {isPinning ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <Ionicons name={post.is_pinned ? 'pin-outline' : 'pin'} size={22} color={colors.foreground} />
                )}
                <Text size="base" weight="600" style={styles.optionText}>
                  {post.is_pinned ? 'Desafixar publicação' : 'Fixar no perfil'}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={22} color={colors.foreground} />
              <Text size="base" weight="600" style={styles.optionText}>Compartilhar</Text>
            </Pressable>

            <Pressable
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <Ionicons name="download-outline" size={22} color={colors.foreground} />
              )}
              <Text size="base" weight="600" style={styles.optionText}>Baixar imagem</Text>
            </Pressable>

            {isOwnPost && (
              <Pressable
                style={[styles.optionItem, { borderBottomWidth: 0 }]}
                onPress={() => setDeleteConfirmOpen(true)}
              >
                <Ionicons name="trash-outline" size={22} color={colors.destructive} />
                <Text size="base" weight="600" style={[styles.optionText, { color: colors.destructive }]}>Excluir</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
    paddingBottom: 32,
  },
  optionsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    marginLeft: 16,
  },
  // Confirm sheet (delete)
  confirmSheet: {
    width: '100%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  confirmBody: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogDesc: {
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
})