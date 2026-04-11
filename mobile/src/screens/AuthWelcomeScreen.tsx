import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Animated, Easing, Image, StyleSheet, View } from 'react-native'
import { Button } from '../components/ui/Button'
import { AuthStackParamList } from '../navigation/types'

type Props = StackScreenProps<AuthStackParamList, 'AuthWelcome'>

export default function AuthWelcomeScreen({ navigation }: Readonly<Props>) {
  const logoOpacity = React.useRef(new Animated.Value(0)).current
  const logoTranslateY = React.useRef(new Animated.Value(-22)).current
  const brandTextOpacity = React.useRef(new Animated.Value(1)).current
  const brandTextTranslateY = React.useRef(new Animated.Value(0)).current
  const [isNavigating, setIsNavigating] = React.useState(false)

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [logoOpacity, logoTranslateY])

  const goToLogin = React.useCallback(() => {
    if (isNavigating) return
    setIsNavigating(true)

    Animated.parallel([
      Animated.timing(brandTextOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(brandTextTranslateY, {
        toValue: 34,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Login')
      setTimeout(() => {
        brandTextOpacity.setValue(1)
        brandTextTranslateY.setValue(0)
        setIsNavigating(false)
      }, 300)
    })
  }, [brandTextOpacity, brandTextTranslateY, isNavigating, navigation])

  return (
    <View style={styles.screen}>
      <View style={styles.brandArea}>
        <Animated.Image
          source={require('../assets/icon.png')}
          resizeMode="contain"
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }],
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.brandText,
            {
              opacity: Animated.multiply(logoOpacity, brandTextOpacity),
              transform: [{ translateY: Animated.add(logoTranslateY, brandTextTranslateY) }],
            },
          ]}
        >
          PetLink
        </Animated.Text>
      </View>

      <View style={styles.bottomArea}>
        <Button
          label="Vamos"
          size="lg"
          variant="outline"
          onPress={goToLogin}
          disabled={isNavigating}
          style={styles.startButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#5D7052',
  },
  brandArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  logo: {
    width: 212,
    height: 212,
  },
  brandText: {
    position: 'absolute',
    top: '54%',
    color: '#F3F4F1',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.16)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
    gap: 10,
  },
  startButton: {
    width: '100%',
    backgroundColor: '#F3F4F1',
    borderColor: '#F3F4F1',
  },
})
