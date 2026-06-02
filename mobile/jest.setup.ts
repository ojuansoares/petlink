import '@testing-library/react-native/build/matchers/extend-expect'

jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ data: {} })),
      post: jest.fn(() => Promise.resolve({ data: {} })),
      put: jest.fn(() => Promise.resolve({ data: {} })),
      delete: jest.fn(() => Promise.resolve({ data: {} })),
      interceptors: { request: { use: jest.fn(), eject: jest.fn() }, response: { use: jest.fn(), eject: jest.fn() } },
    })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn(), eject: jest.fn() }, response: { use: jest.fn(), eject: jest.fn() } },
    isAxiosError: jest.fn((err: unknown): err is Error & { isAxiosError: true; response?: { data?: { error?: string; message?: string } } } => {
      return typeof err === 'object' && err !== null && 'isAxiosError' in err
    }),
  }
  return mockAxios
})

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      order: jest.fn().mockReturnThis(),
    })),
  })),
}))

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset,
    initialWindowMetrics: { insets: inset, frame: { x: 0, y: 0, width: 0, height: 0 } },
  }
})

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  Reanimated.default.call = () => {}
  return Reanimated
})

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    TouchableOpacity: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    FlingGestureHandler: View,
    NativeViewGestureHandler: View,
  }
})

jest.mock('react-native-screens', () => {
  const View = require('react-native').View
  return {
    enableScreens: jest.fn(),
    Screen: View,
    ScreenContainer: View,
    ScreenStack: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    SearchBar: View,
  }
})

jest.mock('react-native-webview', () => {
  const View = require('react-native').View
  return { WebView: View }
})

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve({ password: 'mock' })),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
}))

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
}))

jest.mock('@react-native-community/datetimepicker', () => {
  const View = require('react-native').View
  const Picker = (props: object) => View
  return { default: Picker, DateTimePickerEvent: {} }
})

jest.mock('@nozbe/watermelondb', () => {
  class Model {
    static table = ''
    static columns = []
    static associations = {}
    _raw = {}
    async create(cb: (model: this) => void) {
      cb(this)
      return this
    }
    async update(cb: (model: this) => void) {
      cb(this)
      return this
    }
    async destroyPermanently() {}
    async markAsDeleted() {}
  }
  const Q = {
    and: (...conditions: string[]) => conditions,
    or: (...conditions: string[]) => conditions,
    where: (field: string, value: unknown) => ({ field, value }),
    eq: (value: unknown) => value,
    notEq: (value: unknown) => value,
    gt: (value: unknown) => value,
    gte: (value: unknown) => value,
    lt: (value: unknown) => value,
    lte: (value: unknown) => value,
    like: (value: string) => value,
    on: (field: string, condition: unknown) => ({ field, condition }),
    sortBy: (field: string, dir: 'asc' | 'desc') => ({ field, dir }),
    experimentalSortBy: (field: string, dir: 'asc' | 'desc') => ({ field, dir }),
  }
  return { Model, Q, appSchema: jest.fn(), tableSchema: jest.fn() }
})

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => ({
  default: class SQLiteAdapter {
    constructor() {}
    async setUp() {}
    async find() {}
    async query() {}
    async create() {}
    async update() {}
    async destroyPermanently() {}
    async markAsDeleted() {}
    async getDeletedRecords() {}
    async destroyDeletedRecords() {}
    async unsafeResetDatabase() {}
    async batch() {}
  },
}))

jest.mock('@expo-google-fonts/nunito', () => ({
  Nunito_400Regular: '',
  Nunito_600SemiBold: '',
  Nunito_700Bold: '',
  useFonts: () => [true],
}))

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native')
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), push: jest.fn() }),
    useRoute: () => ({ params: {} }),
  }
})

jest.mock('@react-navigation/stack', () => {
  const actual = jest.requireActual('@react-navigation/stack')
  return {
    ...actual,
    createStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => children,
      Screen: ({ children }: { children: React.ReactNode }) => children,
    }),
  }
})

jest.mock('@react-navigation/bottom-tabs', () => {
  const actual = jest.requireActual('@react-navigation/bottom-tabs')
  return {
    ...actual,
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => children,
      Screen: ({ children }: { children: React.ReactNode }) => children,
    }),
  }
})
