import { makeStyles } from '../../theme/makeStyles'

export const useFeedStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  postContainer: {
    marginBottom: 0,
    backgroundColor: theme.colors.card,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
  },
  postFooter: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  caption: {
    marginTop: 4,
  },
  date: {
    marginTop: 8,
    opacity: 0.6,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: theme.colors.background,
  }
}))
