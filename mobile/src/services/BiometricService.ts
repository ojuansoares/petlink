import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { readAuthTokens } from '../utils/authStorage'

const BIOMETRIC_ENABLED_KEY = 'petlink_biometric_enabled'
const BIOMETRIC_SESSION_LOCKED_KEY = 'petlink_biometric_session_locked'

export async function isBiometricAvailable(): Promise<boolean> {
	try {
		const compatible = await LocalAuthentication.hasHardwareAsync()
		const enrolled = await LocalAuthentication.isEnrolledAsync()
		return compatible && enrolled
	} catch {
		return false
	}
}

export async function authenticateBiometric(): Promise<boolean> {
	try {
		const result = await LocalAuthentication.authenticateAsync({
			promptMessage: 'Entrar com biometria',
			cancelLabel: 'Cancelar',
			disableDeviceFallback: false,
		})

		return Boolean(result.success)
	} catch {
		return false
	}
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
	try {
		await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0')
	} catch {
		// ignore
	}
}

export async function isBiometricEnabled(): Promise<boolean> {
	try {
		const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)
		return value === '1'
	} catch {
		return false
	}
}

export async function canUseBiometricLogin(): Promise<boolean> {
	const [enabled, available] = await Promise.all([
		isBiometricEnabled(),
		isBiometricAvailable(),
	])

	return enabled && available
}

export async function canOfferBiometricLogin(): Promise<boolean> {
	return isBiometricAvailable()
}

export async function hasStoredAuthSession(): Promise<boolean> {
	const tokens = await readAuthTokens()
	return Boolean(tokens?.refreshToken)
}

export async function setBiometricSessionLocked(locked: boolean): Promise<void> {
	try {
		await SecureStore.setItemAsync(BIOMETRIC_SESSION_LOCKED_KEY, locked ? '1' : '0')
	} catch {
		// ignore
	}
}

export async function isBiometricSessionLocked(): Promise<boolean> {
	try {
		const value = await SecureStore.getItemAsync(BIOMETRIC_SESSION_LOCKED_KEY)
		return value === '1'
	} catch {
		return false
	}
}
