import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

export default function RegisterScreen() {
    const { signUp } = useAuth();
        const { language } = useLanguage();

        const copy = language === 'de-CH'
                ? {
                        title: 'Registrieren',
                        required: 'E-Mail und Passwörter sind erforderlich.',
                        emailInvalid: 'Bitte gib eine gültige E-Mail-Adresse ein.',
                        passwordsMismatch: 'Passwörter stimmen nicht überein.',
                        genericError: 'Ein Fehler ist aufgetreten',
                        email: 'E-Mail',
                        password: 'Passwort',
                        confirmPassword: 'Passwort bestätigen',
                        loading: 'Lädt...',
                        register: 'Registrieren',
                        alreadyAccount: 'Schon ein Konto? Login',
                    }
                : {
                        title: 'Register',
                        required: 'Email and passwords are required.',
                        emailInvalid: 'Please enter a valid email address.',
                        passwordsMismatch: 'Passwords do not match.',
                        genericError: 'An error occurred',
                        email: 'Email',
                        password: 'Password',
                        confirmPassword: 'Confirm Password',
                        loading: 'Loading...',
                        register: 'Register',
                        alreadyAccount: 'Already have an account? Login',
                    };

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const onSubmit = async () => {
        setErrorMessage(null);
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password || !confirmPassword) {
            setErrorMessage(copy.required);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setErrorMessage(copy.emailInvalid);
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage(copy.passwordsMismatch);
            return;
        }

        setIsSubmitting(true)
        
        try {
            await signUp(normalizedEmail, password)
            router.replace('/(tabs)/home')
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : copy.genericError)
        } finally {
            setIsSubmitting(false)
        }

    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-slate-900"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="gap-3">
                    <View className="mb-10 items-center gap-2.5">
                        <Image
                            source={require('../assets/icons/dumbell.png')}
                            className="h-[72px] w-[72px]"
                            resizeMode="contain"
                        />
                        <Text className="text-[28px] font-extrabold tracking-[1.2px] text-white">GOFIT</Text>
                    </View>

                    <Text className="mb-2 text-[30px] font-bold text-white">{copy.title}</Text>

                    <TextInput
                        className="rounded-[10px] border border-slate-600 bg-slate-800 px-3.5 py-3 text-white"
                        placeholder={copy.email}
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        selectionColor="#ffffff"
                    />

                    <TextInput
                        className="rounded-[10px] border border-slate-600 bg-slate-800 px-3.5 py-3 text-white"
                        placeholder={copy.password}
                        placeholderTextColor="#9ca3af"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        selectionColor="#ffffff"
                    />

                    <TextInput
                        className="rounded-[10px] border border-slate-600 bg-slate-800 px-3.5 py-3 text-white"
                        placeholder={copy.confirmPassword}
                        placeholderTextColor="#9ca3af"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        selectionColor="#ffffff"
                    />

                    {errorMessage ? <Text className="text-red-300">{errorMessage}</Text> : null}

                    <Pressable
                        className={`items-center rounded-[10px] bg-blue-600 py-3 ${isSubmitting ? 'opacity-60' : ''}`}
                        disabled={isSubmitting}
                        onPress={onSubmit}
                    >
                        <Text className="text-base font-semibold text-white">{isSubmitting ? copy.loading : copy.register}</Text>
                    </Pressable>

                    <Link href="/login" className="mt-1 text-center text-sky-300">
                        {copy.alreadyAccount}
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}