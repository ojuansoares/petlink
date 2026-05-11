import { StyleSheet } from 'react-native'

/**
 * Global layout utilities that don't depend on theme colors.
 * Use these to avoid repeating common flexbox patterns.
 */
export const globalLayout = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  screenPadding: {
    padding: 16,
  },
  gap8: {
    gap: 8,
  },
  gap16: {
    gap: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    margin: 16,
  }
})
