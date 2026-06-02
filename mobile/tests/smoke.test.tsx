import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'

it('renders a text element', () => {
  render(<Text>Hello Jest</Text>)
  expect(screen.getByText('Hello Jest')).toBeTruthy()
})
