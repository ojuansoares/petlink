import { makeStyles } from '../../theme/makeStyles'

export const usePetsStyles = makeStyles((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  // Tab Bar
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  // Selector
  selectorScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectorContent: {
    gap: 12,
    paddingRight: 32,
  },
  selectorItem: {
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderRadius: 16,
    padding: 8,
    minWidth: 80,
  },
  // Detail Card
  detailCard: {
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 8,
  },
  avatarShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 6,
  },
  avatarPressable: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: theme.colors.card,
    backgroundColor: theme.colors.muted,
  },
  avatarEditFoot: {
    position: 'absolute',
    bottom: -14,
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
  heroSection: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 12,
    gap: 10,
  },
  heroName: {
    marginTop: 8,
  },
  heroTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  infoItem: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.withAlpha(theme.colors.border, 0.5),
  },
  // Extra Section
  extraSection: {
    padding: 16,
    gap: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.muted,
  },
  observationsBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.withAlpha(theme.colors.secondary, 0.05),
  },
  // Chart
  weightChartSection: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  weightChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    gap: 8,
  },
  chartContainer: {
    height: 140,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    height: 140,
    paddingBottom: 8,
    paddingTop: 12,
    gap: 4,
  },
  barColumn: {
    alignItems: 'center',
    gap: 4,
    width: 45,
    marginHorizontal: 2,
  },
  chartBar: {
    width: 28,
  },
  barLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  chartNavButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chartNavButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartScrollContent: {
    paddingRight: 32,
  },
  // Modals
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  flowSheet: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: theme.colors.background,
  },
  flowSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  flowSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  flowSheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Control
  controlGrid: {
    padding: 20,
    gap: 16,
  },
  controlCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  controlIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  controlInfo: {
    flex: 1,
  },
  controlBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
}))
