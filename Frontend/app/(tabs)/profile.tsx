import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const SETTINGS_KEY = 'profile_settings_v1';
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;
const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const MIN_AGE = 10;
const MAX_AGE = 130;

type Settings = {};

const defaultSettings: Settings = {};

type PickerType = 'gender' | 'day' | 'month' | 'year' | null;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();

  const meta = session?.user?.user_metadata ?? {};
  const userEmail = session?.user?.email ?? '';

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState('');
  const [birthDay, setBirthDay] = useState(1);
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthYear, setBirthYear] = useState(2000);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [heightInput, setHeightInput] = useState('170');
  const [weightInput, setWeightInput] = useState('70');
  const [homeGym, setHomeGym] = useState(false);
  const [goal, setGoal] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarDraftUrl, setAvatarDraftUrl] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [picker, setPicker] = useState<PickerType>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // PASSWORD STATE
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Load settings from storage
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((data) => {
      if (data) setSettings({ ...defaultSettings, ...JSON.parse(data) });
    });
  }, []);

  // Parse birth date from metadata
  useEffect(() => {
    const bd = (meta.birth_date as string) ?? '';
    const match = bd.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
      setBirthDay(Number(match[1]));
      setBirthMonth(Number(match[2]));
      setBirthYear(Number(match[3]));
    }
  }, [meta.birth_date]);

  // Keep local profile state in sync with auth metadata after login/session refresh.
  useEffect(() => {
    if (!session?.user) return;

    setFirstName((meta.first_name as string) ?? '');
    setLastName((meta.last_name as string) ?? '');
    const nextAvatar = (meta.avatar_url as string) ?? '';
    if (nextAvatar) {
      setAvatarUrl(nextAvatar);
    }
    setGender((meta.gender as string) ?? '');

    const nextHeight = (meta.body_height_cm as number) ?? 170;
    const nextWeight = (meta.body_weight_kg as number) ?? 70;
    setHeight(nextHeight);
    setWeight(nextWeight);
    setHeightInput(String(nextHeight));
    setWeightInput(String(nextWeight));

    setHomeGym((meta.home_gym as boolean) ?? false);
    setGoal((meta.goal as string) ?? '');
  }, [
    session?.user?.id,
    session?.user?.email,
    meta.first_name,
    meta.last_name,
    meta.avatar_url,
    meta.gender,
    meta.body_height_cm,
    meta.body_weight_kg,
    meta.home_gym,
    meta.goal,
  ]);

  const updatePassword = async () => {
    // Validate old password
    if (!oldPassword) {
      Alert.alert('Fehler', 'Bitte gib dein aktuelles Passwort ein');
      return;
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Fehler', 'Neues Passwort muss mindestens 8 Zeichen haben');
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert('Fehler', 'Die neuen Passwörter stimmen nicht überein');
      return;
    }

    // Check if new password is different from old password
    if (newPassword === oldPassword) {
      Alert.alert('Fehler', 'Das neue Passwort muss sich vom alten unterscheiden');
      return;
    }

    try {
      setPasswordSaving(true);
      
      const email = session?.user?.email;
      if (!email) throw new Error('Keine E-Mail-Adresse gefunden');
      
      // Step 1: Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });
      
      if (signInError) {
        Alert.alert('Fehler', 'Aktuelles Passwort ist falsch');
        return;
      }
      
      // Step 2: Update to new password in the database
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      
      Alert.alert('Erfolg', 'Passwort wurde in der Datenbank aktualisiert');
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Passwort konnte nicht geändert werden');
    } finally {
      setPasswordSaving(false);
    }
  };

  const displayName = `${firstName} ${lastName}`.trim() || userEmail || 'User';
  const initials = displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';
  const birthDate = `${String(birthDay).padStart(2, '0')}.${String(birthMonth).padStart(2, '0')}.${birthYear}`;

  const getPickerOptions = (): (string | number)[] => {
    switch (picker) {
      case 'gender': return ['Männlich', 'Weiblich', 'Sonstiges'];
      case 'day': return Array.from({ length: 31 }, (_, i) => i + 1);
      case 'month': return Array.from({ length: 12 }, (_, i) => i + 1);
      case 'year': return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => new Date().getFullYear() - MIN_AGE - i);
      default: return [];
    }
  };

  const getPickerValue = () => {
    switch (picker) {
      case 'gender': return gender;
      case 'day': return birthDay;
      case 'month': return birthMonth;
      case 'year': return birthYear;
      default: return '';
    }
  };

  const selectValue = (val: string | number) => {
    switch (picker) {
      case 'gender': setGender(String(val)); break;
      case 'day': setBirthDay(Number(val)); break;
      case 'month': setBirthMonth(Number(val)); break;
      case 'year': setBirthYear(Number(val)); break;
    }
    setPicker(null);
  };

  const toDigitsOnly = (value: string) => value.replace(/\D+/g, '');

  const handleHeightChange = (value: string) => {
    const digits = toDigitsOnly(value);
    if (!digits) {
      setHeightInput('');
      return;
    }
    const clamped = Math.min(Number(digits.slice(0, 3)), MAX_HEIGHT_CM);
    setHeightInput(String(clamped));
  };

  const handleWeightChange = (value: string) => {
    const digits = toDigitsOnly(value);
    if (!digits) {
      setWeightInput('');
      return;
    }
    const clamped = Math.min(Number(digits.slice(0, 3)), MAX_WEIGHT_KG);
    setWeightInput(String(clamped));
  };

  const openAvatarModal = () => {
    setAvatarDraftUrl(avatarUrl);
    setAvatarModalVisible(true);
  };

  const persistAvatarForAccount = async (nextAvatarUrl: string) => {
    const trimmed = nextAvatarUrl.trim();
    const { error } = await supabase.auth.updateUser({
      data: {
        avatar_url: trimmed,
      },
    });

    if (error) throw error;

    await supabase.auth.refreshSession();
    setAvatarUrl(trimmed);
    setAvatarDraftUrl(trimmed);
  };

  const saveAvatarFromUrl = async () => {
    const next = avatarDraftUrl.trim();
    if (!next) {
      Alert.alert('Fehler', 'Bitte eine gültige Bild-URL eingeben.');
      return;
    }

    try {
      setAvatarSaving(true);
      await persistAvatarForAccount(next);
      setAvatarModalVisible(false);
      Alert.alert('Gespeichert', 'Profilbild wurde für deinen Account gespeichert.');
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Profilbild konnte nicht gespeichert werden.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setAvatarSaving(true);
      await persistAvatarForAccount('');
      setAvatarModalVisible(false);
      Alert.alert('Gespeichert', 'Profilbild wurde entfernt.');
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Profilbild konnte nicht entfernt werden.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const chooseAvatarFile = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Fehler', 'Bitte erlaube den Zugriff auf deine Mediathek.');
          return;
        }
      }

      setAvatarSaving(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      let nextUrl = asset.uri ?? '';

      if (asset.base64) {
        const mimeType = asset.mimeType ?? 'image/jpeg';
        nextUrl = `data:${mimeType};base64,${asset.base64}`;
      }

      if (!nextUrl) {
        Alert.alert('Fehler', 'Datei konnte nicht gelesen werden.');
        return;
      }

      await persistAvatarForAccount(nextUrl);
      setAvatarModalVisible(false);
      Alert.alert('Gespeichert', 'Profilbild wurde für deinen Account gespeichert.');
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Datei konnte nicht geladen werden.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const parsedHeight = Number(heightInput);
      const parsedWeight = Number(weightInput);
      const now = new Date();
      const minYear = now.getFullYear() - MAX_AGE;
      const maxYear = now.getFullYear() - MIN_AGE;

      const isValidDate = (() => {
        const d = new Date(birthYear, birthMonth - 1, birthDay);
        return (
          d.getFullYear() === birthYear &&
          d.getMonth() === birthMonth - 1 &&
          d.getDate() === birthDay
        );
      })();

      if (
        !Number.isFinite(parsedHeight) ||
        parsedHeight < MIN_HEIGHT_CM ||
        parsedHeight > MAX_HEIGHT_CM
      ) {
        Alert.alert('Fehler', `Grösse muss zwischen ${MIN_HEIGHT_CM} und ${MAX_HEIGHT_CM} cm liegen.`);
        return;
      }

      if (
        !Number.isFinite(parsedWeight) ||
        parsedWeight < MIN_WEIGHT_KG ||
        parsedWeight > MAX_WEIGHT_KG
      ) {
        Alert.alert('Fehler', `Gewicht muss zwischen ${MIN_WEIGHT_KG} und ${MAX_WEIGHT_KG} kg liegen.`);
        return;
      }

      if (!isValidDate || birthYear < minYear || birthYear > maxYear) {
        Alert.alert('Fehler', `Geburtsdatum ist ungültig. Erlaubt: Alter ${MIN_AGE}-${MAX_AGE} Jahre.`);
        return;
      }

      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName} ${lastName}`.trim(),
          avatar_url: avatarUrl.trim(),
          gender: gender.trim(),
          birth_date: birthDate,
          body_height_cm: parsedHeight,
          body_weight_kg: parsedWeight,
          home_gym: homeGym,
          goal: goal.trim(),
        },
      });

      if (profileError) throw profileError;

      setHeight(parsedHeight);
      setWeight(parsedWeight);
      setEditing(false);
      Alert.alert('Gespeichert', 'Profil aktualisiert.');
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    Alert.alert('Einstellungen gespeichert');
  };

  const PickerRow = ({ label, value, type }: { label: string; value: string; type: PickerType }) => (
    <TouchableOpacity
      onPress={() => setPicker(type)}
      className="flex-row justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
    >
      <Text className="text-slate-300">{label}</Text>
      <Text className="text-white">{value || 'Auswählen'} ▾</Text>
    </TouchableOpacity>
  );

  const SettingRow = ({ label, value, onChange, disabled = false }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-slate-200">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#334155', true: '#0284c7' }}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }}
        >
          <Text className="text-3xl font-extrabold text-white">Mein Profil</Text>

          {/* Avatar + Name + Email */}
          <View className="relative mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <TouchableOpacity
              onPress={openAvatarModal}
              className="absolute right-3 top-3 z-10 h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-800"
            >
              <Text className="text-slate-200">✎</Text>
            </TouchableOpacity>
            
            <View className="flex-row items-center">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-20 w-20 rounded-full" />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                  <Text className="text-2xl font-bold text-slate-200">{initials}</Text>
                </View>
              )}
              
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-white">
                  {displayName}
                </Text>
                <Text className="text-sm text-slate-400">
                  {userEmail}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Card */}
          <View className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Profildaten</Text>
              {!editing && (
                <TouchableOpacity onPress={() => setEditing(true)} className="rounded-lg border border-sky-400 px-3 py-1">
                  <Text className="text-sky-300">Bearbeiten</Text>
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <View className="mt-4 gap-3">
                <Text className="text-xs uppercase text-slate-400">Profilbild</Text>
                <View className="flex-row items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-3">
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} className="h-12 w-12 rounded-full" />
                  ) : (
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                      <Text className="font-bold text-slate-200">{initials}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={openAvatarModal} className="ml-3 rounded-lg border border-sky-500 px-3 py-2">
                    <Text className="text-sky-300">Bild bearbeiten</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-xs uppercase text-slate-400">Vorname</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Vorname"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">Nachname</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nachname"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">Geschlecht</Text>
                <PickerRow label="Geschlecht" value={gender} type="gender" />
                <Text className="text-xs uppercase text-slate-400">Geburtsdatum (Tag, Monat, Jahr)</Text>
                <PickerRow label="Tag" value={String(birthDay).padStart(2, '0')} type="day" />
                <PickerRow label="Monat" value={String(birthMonth).padStart(2, '0')} type="month" />
                <PickerRow label="Jahr" value={String(birthYear)} type="year" />
                <Text className="text-xs uppercase text-slate-400">Grösse (cm)</Text>
                <TextInput
                  value={heightInput}
                  onChangeText={handleHeightChange}
                  placeholder="Grösse (cm)"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">Gewicht (kg)</Text>
                <TextInput
                  value={weightInput}
                  onChangeText={handleWeightChange}
                  placeholder="Gewicht (kg)"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">Heimstudio</Text>
                <View className="flex-row gap-2">
                  {['Ja', 'Nein'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setHomeGym(opt === 'Ja')}
                      className={`rounded-lg border px-3 py-2 ${homeGym === (opt === 'Ja') ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700'}`}
                    >
                      <Text className={homeGym === (opt === 'Ja') ? 'text-cyan-200' : 'text-slate-300'}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-xs uppercase text-slate-400">Ziel</Text>
                <TextInput
                  value={goal}
                  onChangeText={setGoal}
                  placeholder="Ziel"
                  placeholderTextColor="#64748b"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={saveProfile}
                    disabled={saving}
                    className={`min-h-12 flex-1 items-center justify-center rounded-xl py-3 ${saving ? 'bg-slate-600' : 'bg-sky-500'}`}
                  >
                    <Text className="text-center font-bold text-white">{saving ? 'Speichern...' : 'Speichern'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditing(false)} className="min-h-12 items-center justify-center rounded-xl border border-slate-600 px-4 py-3">
                    <Text className="text-slate-300">Abbrechen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="mt-4 gap-2">
                {[
                  ['Vorname', firstName],
                  ['Nachname', lastName],
                  ['E-Mail', userEmail],
                  ['Geschlecht', gender],
                  ['Geburtsdatum', birthDate],
                  ['Grösse', `${height} cm`],
                  ['Gewicht', `${weight} kg`],
                  ['Heimstudio', homeGym ? 'Ja' : 'Nein'],
                  ['Ziel', goal],
                ].map(([label, value]) => (
                  <View key={label} className="rounded-lg bg-slate-800/80 px-3 py-2">
                    <Text className="text-xs uppercase text-slate-400">{label}</Text>
                    <Text className="text-slate-200">{value || 'Nicht gesetzt'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Settings */}
          <View className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <Text className="text-lg font-bold text-white">Einstellungen</Text>

            <TouchableOpacity onPress={saveSettings} className="mt-4 rounded-xl bg-cyan-600 py-3">
              <Text className="text-center font-bold text-white">Speichern</Text>
            </TouchableOpacity>
          </View>

          {/* Password Change Button */}
          <TouchableOpacity 
            onPress={() => setShowPasswordSection(!showPasswordSection)} 
            className="mt-5 rounded-xl border border-sky-500 bg-sky-500/10 py-3"
          >
            <Text className="text-center font-bold text-sky-300">
              {showPasswordSection ? '▼ Passwort ändern schliessen' : '▶ Passwort ändern'}
            </Text>
          </TouchableOpacity>

          {/* Expandable Password Section */}
          {showPasswordSection && (
            <View className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <Text className="text-lg font-bold text-white">Passwort ändern</Text>
              
              <Text className="mt-3 text-xs uppercase text-slate-400">Aktuelles Passwort</Text>
              <TextInput
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Aktuelles Passwort eingeben"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              
              <Text className="mt-3 text-xs uppercase text-slate-400">Neues Passwort</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Neues Passwort (min. 8 Zeichen)"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              
              <Text className="mt-3 text-xs uppercase text-slate-400">Neues Passwort bestätigen</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Neues Passwort wiederholen"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              
              <TouchableOpacity
                onPress={updatePassword}
                disabled={passwordSaving}
                className="mt-4 rounded-xl bg-cyan-600 py-3"
              >
                <Text className="text-center font-bold text-white">
                  {passwordSaving ? 'Speichert...' : 'Passwort ändern'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Pressable onPress={signOut} className="mt-5 self-start rounded-lg border border-rose-500 px-4 py-2">
            <Text className="text-rose-300">Abmelden</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable className="flex-1 bg-black/50" onPress={() => setPicker(null)}>
          <Pressable className="mt-auto rounded-t-3xl bg-slate-900 p-4 pb-8">
            <ScrollView className="max-h-80">
              {getPickerOptions().map((opt) => (
                <TouchableOpacity
                  key={String(opt)}
                  onPress={() => selectValue(opt)}
                  className={`border-b border-slate-800 px-4 py-3 ${getPickerValue() === opt ? 'bg-cyan-500/20' : ''}`}
                >
                  <Text className={getPickerValue() === opt ? 'text-cyan-200' : 'text-slate-200'}>
                    {picker === 'gender' ? String(opt) : String(opt).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setPicker(null)} className="mt-3 rounded-xl border border-slate-700 py-3">
              <Text className="text-center text-slate-300">Schliessen</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={avatarModalVisible} transparent animationType="fade" onRequestClose={() => setAvatarModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/60 px-5" onPress={() => setAvatarModalVisible(false)}>
          <Pressable className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <Text className="text-lg font-bold text-white">Profilbild bearbeiten</Text>
            <Text className="mt-2 text-xs uppercase text-slate-400">Aktuelles Bild</Text>
            <View className="mt-2 items-center">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-20 w-20 rounded-full border border-slate-700" />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                  <Text className="text-xl font-bold text-slate-200">{initials}</Text>
                </View>
              )}
            </View>
            <TextInput
              value={avatarDraftUrl}
              onChangeText={setAvatarDraftUrl}
              placeholder="Bild URL einfügen"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
            <TouchableOpacity onPress={() => void saveAvatarFromUrl()} disabled={avatarSaving} className="mt-3 rounded-xl bg-sky-500 py-3">
              <Text className="text-center font-bold text-white">{avatarSaving ? 'Speichert...' : 'URL übernehmen'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={chooseAvatarFile} disabled={avatarSaving} className="mt-2 rounded-xl border border-slate-500 py-3">
              <Text className="text-center font-bold text-slate-200">{avatarSaving ? 'Lädt...' : 'Datei auswählen'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void removeAvatar()} disabled={avatarSaving} className="mt-2 rounded-xl border border-rose-500 py-3">
              <Text className="text-center font-bold text-rose-300">{avatarSaving ? 'Speichert...' : 'Bild entfernen'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAvatarModalVisible(false)} className="mt-2 rounded-xl border border-slate-600 py-3">
              <Text className="text-center font-bold text-slate-300">Schliessen</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}