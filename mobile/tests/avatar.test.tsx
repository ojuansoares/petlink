import { ActivityIndicator } from 'react-native'
import { screen } from '@testing-library/react-native'
import { renderWithProviders } from './test-utils'
import { Avatar } from '../src/components/ui/Avatar'

it('renders initials fallback', () => {
  renderWithProviders(<Avatar name="John Doe" size={40} />)
  expect(screen.getByText('JD')).toBeTruthy()
})

it('renders single-name initials', () => {
  renderWithProviders(<Avatar name="Maria" size={40} />)
  expect(screen.getByText('MA')).toBeTruthy()
})

it('renders question mark for empty name', () => {
  renderWithProviders(<Avatar size={40} />)
  expect(screen.getByText('?')).toBeTruthy()
})

it('renders loading indicator', () => {
  const { UNSAFE_getByType } = renderWithProviders(<Avatar loading size={40} />)
  expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy()
})

it('renders with image source without crashing', () => {
  const { toJSON } = renderWithProviders(<Avatar source="https://example.com/photo.jpg" size={40} />)
  expect(toJSON()).toBeTruthy()
})
