import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, View, Share, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library'
import { useTheme } from '../../hooks/useTheme'
import { useNetworkCheck } from '../../hooks/useNetworkCheck'
import { useAppDispatch, useAppSelector } from '../../store'
import { deletePostThunk, togglePinThunk, updatePostThunk, Post } from '../../store/slices/postsSlice'
import { showToast } from '../../store/slices/uiSlice'
import { Button } from './Button'
import { Input } from './Input'
import { Heading, Text } from './Typography'

interface PostOptionsModalProps {
  post: Post
  visible: boolean
  onClose: () => void
  isOwnPost: boolean
}

export function PostOptionsModal({ post, visible, onClose, isOwnPost }: Readonly<PostOptionsModalProps>) {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const { isOnline } = useNetworkCheck()

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
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Olha esse post de ${post.pets?.name || 'um pet'}: ${post.image_url}`,
      })
      onClose()
    } catch (error) {
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
      
      const asset = await MediaLibrary.createAssetAsync(post.image_url)
      dispatch(showToast({ type: 'success', message: 'Imagem salva na galeria!' }))
      onClose()
    } catch (error: any) {
      console.error('Download error:', error)
      dispatch(showToast({ type: 'error', message: error?.message || 'Erro ao salvar imagem' }))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleTogglePin = async () => {
    requireOnline(async () => {
      try {
        await dispatch(togglePinThunk(post.id)).unwrap()
        dispatch(showToast({ type: 'success', message: post.is_pinned ? 'Post desfixado' : 'Post fixado com sucesso' }))
        onClose()
      } catch (error: any) {
        dispatch(showToast({ type: 'error', message: error ?? 'Erro ao fixar post' }))
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
        dispatch(showToast({ type: 'error', message: error ?? 'Erro ao excluir post' }))
      }
    })
  }

  const handleUpdate = async () => {
    requireOnline(async () => {
      try {
        setIsUpdating(true)
        await dispatch(updatePostThunk({
          postId: post.id,
          patch: { caption, location }
        })).unwrap()
        dispatch(showToast({ type: 'success', message: 'Post atualizado' }))
        setEditOpen(false)
        onClose()
      } catch (error: any) {
        dispatch(showToast({ type: 'error', message: error ?? 'Erro ao atualizar post' }))
      } finally {
        setIsUpdating(false)
      }
    })
  }

  if (editOpen) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Heading size="lg" weight="800">Editar Publicação</Heading>
              <Pressable onPress={() => setEditOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.contentContainer}>
              <Input
                label="Legenda"
                placeholder="Escreva uma legenda..."
                value={caption}
                onChangeText={setCaption}
              />
              <Input
                label="Localização"
                placeholder="Ex: São Paulo"
                value={location}
                onChangeText={setLocation}
              />
              <Button
                label="Salvar alterações"
                onPress={handleUpdate}
                loading={isUpdating}
                disabled={isUpdating}
                style={{ marginTop: 16 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  if (deleteConfirmOpen) {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={() => setDeleteConfirmOpen(false)}>
        <View style={styles.centerBackdrop}>
          <View style={[styles.dialogContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dialogIcon}>
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
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandleWrap}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          </View>
          
          <View style={styles.optionsList}>
            {isOwnPost && (
              <>
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
              </>
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
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  optionsList: {
    paddingHorizontal: 16,
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
  container: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  dialogContainer: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogDesc: {
    textAlign: 'center',
    marginBottom: 24,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
})