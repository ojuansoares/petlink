import { makeStyles } from '../../theme/makeStyles'

export const useProfileStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarPressable: {
    borderRadius: 999,
    borderWidth: 4,
    borderColor: theme.colors.card,
    backgroundColor: theme.colors.muted,
    overflow: 'hidden',
  },
  name: {
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  bio: {
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  // Grid
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  // Modals
  editForm: {
    padding: 16,
    gap: 12,
  },
  editAvatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  // Empty State
  emptyPosts: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    borderColor: theme.colors.border,
    margin: 16,
  }
}))
