import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
    const { signUp } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const onSubmit = async () => {
        setErrorMessage(null);
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password || !confirmPassword) {
            setErrorMessage('Email and passwords are required.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setIsSubmitting(true)
        
        try {
            await signUp(normalizedEmail, password)
            router.replace('/(tabs)')
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsSubmitting(false)
        }

    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Registrieren</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                selectionColor="#ffffff"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                selectionColor="#ffffff"
            />

            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                selectionColor="#ffffff"
            />

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <Pressable style={styles.button} disabled={isSubmitting} onPress={onSubmit}>
                <Text style={styles.buttonText}>{isSubmitting ? 'Loading...' : 'Register'}</Text>
            </Pressable>

            <Link href="/login" style={styles.link}>Already have an account? Login</Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    title: {
        color: '#ffffff',
        fontSize: 30,
        fontWeight: '700',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        borderRadius: 10,
        color: '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    error: {
        color: '#fca5a5',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
    link: {
        color: '#93c5fd',
        textAlign: 'center',
        marginTop: 4,
    },
});