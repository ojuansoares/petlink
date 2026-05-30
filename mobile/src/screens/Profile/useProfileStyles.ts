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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarPressable: {
    borderRadius: 999,
    borderWidth: 4,
    borderColor: theme.colors.card,
    backgroundColor: theme.colors.muted,
    overflow: 'hidden',
  },
  avatarEditFoot: {
    position: 'absolute',
    bottom: -1,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.withAlpha(theme.colors.card, 0.94),
    borderColor: theme.withAlpha(theme.colors.border, 0.9),
  },
  name: {
    marginBottom: 4,
    marginTop: 10,
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
     paddingTop: 12,
     paddingBottom: 4,
     borderTopWidth: 1,
     borderColor: theme.colors.border,
   },
   statItem: {
     alignItems: 'center',
   },
   // Follow button
   followButtonContainer: {
     alignSelf: 'stretch',
     paddingHorizontal: 16,
     marginBottom: 16,
   },
   followButton: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 12,
     borderRadius: 8,
   },
   followButtonFollow: {
     backgroundColor: theme.colors.primary,
   },
   followButtonFollowing: {
     backgroundColor: 'transparent',
     borderWidth: 2,
     borderColor: theme.colors.primary,
   },
    // Grid
  filterContainer: {
    paddingVertical: 8,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  petChipActive: {
    backgroundColor: theme.withAlpha(theme.colors.primary, 0.08),
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
  },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
  },
  miniBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    borderTopWidth: 1,
  },
  miniBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
