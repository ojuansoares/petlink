import React from 'react'
import { ActionOptionsModal } from './ActionOptionsModal'

interface ImagePickerSheetProps {
  visible: boolean
  onClose: () => void
  onCamera: () => void
  onGallery: () => void
}

export function ImagePickerSheet({ visible, onClose, onCamera, onGallery }: ImagePickerSheetProps) {
  return (
    <ActionOptionsModal
      visible={visible}
      onClose={onClose}
      title="Selecionar origem"
      description="Escolha de onde deseja selecionar a imagem"
      options={[
        { label: 'Câmera', icon: 'camera-outline', onPress: onCamera },
        { label: 'Galeria', icon: 'images-outline', onPress: onGallery },
      ]}
    />
  )
}
