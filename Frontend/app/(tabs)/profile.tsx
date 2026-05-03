import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import type { AppLanguage } from '@/hooks/useLanguage';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;
const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const MIN_AGE = 10;
const MAX_AGE = 130;

type PickerType = 'gender' | 'day' | 'month' | 'year' | null;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const meta = session?.user?.user_metadata ?? {};
  const userEmail = session?.user?.email ?? '';

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
  const [picker, setPicker] = useState<PickerType>(null);

  // PASSWORD STATE
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const common = language === 'de-CH'
    ? {
        noEmail: 'Keine E-Mail gefunden',
        userFallback: 'Benutzer',
        day: 'Tag',
        month: 'Monat',
        year: 'Jahr',
        dateFormatHint: '(TT, MM, JJJJ)',
        heightRange: `Grösse muss zwischen ${MIN_HEIGHT_CM} und ${MAX_HEIGHT_CM} cm liegen.`,
        weightRange: `Gewicht muss zwischen ${MIN_WEIGHT_KG} und ${MAX_WEIGHT_KG} kg liegen.`,
        birthDateInvalid: `Geburtsdatum ist ungültig. Erlaubtes Alter: ${MIN_AGE}-${MAX_AGE}.`,
      }
    : {
        noEmail: 'No email found',
        userFallback: 'User',
        day: 'Day',
        month: 'Month',
        year: 'Year',
        dateFormatHint: '(DD, MM, YYYY)',
        heightRange: `Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm.`,
        weightRange: `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`,
        birthDateInvalid: `Birth date is invalid. Allowed age: ${MIN_AGE}-${MAX_AGE}.`,
      };

  const genderOptions = useMemo(
    () => [t('profile.gender.male'), t('profile.gender.female'), t('profile.gender.other')],
    [t]
  );

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
    meta.gender,
    meta.body_height_cm,
    meta.body_weight_kg,
    meta.home_gym,
    meta.goal,
  ]);

  const updatePassword = async () => {
    // Validate old password
    if (!oldPassword) {
      Alert.alert(t('profile.alert.error'), t('profile.alert.missingCurrentPassword'));
      return;
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(t('profile.alert.error'), t('profile.alert.passwordTooShort'));
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert(t('profile.alert.error'), t('profile.alert.passwordMismatch'));
      return;
    }

    // Check if new password is different from old password
    if (newPassword === oldPassword) {
      Alert.alert(t('profile.alert.error'), t('profile.alert.passwordMustDiffer'));
      return;
    }

    try {
      setPasswordSaving(true);
      
      const email = session?.user?.email;
      if (!email) throw new Error(common.noEmail);
      
      // Step 1: Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });
      
      if (signInError) {
        Alert.alert(t('profile.alert.error'), t('profile.alert.invalidCurrentPassword'));
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
      
      Alert.alert(t('profile.alert.success'), t('profile.alert.passwordUpdated'));
    } catch (e) {
      Alert.alert(
        t('profile.alert.error'),
        e instanceof Error ? e.message : t('profile.alert.passwordChangeFailed')
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const displayName = `${firstName} ${lastName}`.trim() || userEmail || common.userFallback;
  const initials = displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';
  const birthDate = `${String(birthDay).padStart(2, '0')}.${String(birthMonth).padStart(2, '0')}.${birthYear}`;

  const getPickerOptions = (): (string | number)[] => {
    switch (picker) {
      case 'gender': return genderOptions;
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
        Alert.alert(t('profile.alert.error'), common.heightRange);
        return;
      }

      if (
        !Number.isFinite(parsedWeight) ||
        parsedWeight < MIN_WEIGHT_KG ||
        parsedWeight > MAX_WEIGHT_KG
      ) {
        Alert.alert(t('profile.alert.error'), common.weightRange);
        return;
      }

      if (!isValidDate || birthYear < minYear || birthYear > maxYear) {
        Alert.alert(t('profile.alert.error'), common.birthDateInvalid);
        return;
      }

      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName} ${lastName}`.trim(),
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
      Alert.alert(t('profile.alert.saved'), t('profile.alert.profileUpdated'));
    } catch (e) {
      Alert.alert(t('profile.alert.error'), e instanceof Error ? e.message : t('profile.alert.profileSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const PickerRow = ({ label, value, type }: { label: string; value: string; type: PickerType }) => (
    <TouchableOpacity
      onPress={() => setPicker(type)}
      className="flex-row justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
    >
      <Text className="text-slate-300">{label}</Text>
      <Text className="text-white">{value || (language === 'de-CH' ? 'Auswählen' : 'Select')} ▾</Text>
    </TouchableOpacity>
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
          <Text className="text-3xl font-extrabold text-white">{t('profile.title')}</Text>

          {/* Profile header */}
          <View className="relative mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <View className="flex-row items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                <Text className="text-2xl font-bold text-slate-200">{initials}</Text>
              </View>
              
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
              <Text className="text-lg font-bold text-white">{t('profile.section.profileData')}</Text>
              {!editing && (
                <TouchableOpacity onPress={() => setEditing(true)} className="rounded-lg border border-sky-400 px-3 py-1">
                  <Text className="text-sky-300">{t('profile.button.edit')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <View className="mt-4 gap-3">
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.firstName')}</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('profile.placeholder.firstName')}
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.lastName')}</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('profile.placeholder.lastName')}
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.gender')}</Text>
                <PickerRow label={t('profile.field.gender')} value={gender} type="gender" />
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.birthDate')} {common.dateFormatHint}</Text>
                <PickerRow label={common.day} value={String(birthDay).padStart(2, '0')} type="day" />
                <PickerRow label={common.month} value={String(birthMonth).padStart(2, '0')} type="month" />
                <PickerRow label={common.year} value={String(birthYear)} type="year" />
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.height')} (cm)</Text>
                <TextInput
                  value={heightInput}
                  onChangeText={handleHeightChange}
                  placeholder={`${t('profile.field.height')} (cm)`}
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.weight')} (kg)</Text>
                <TextInput
                  value={weightInput}
                  onChangeText={handleWeightChange}
                  placeholder={`${t('profile.field.weight')} (kg)`}
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                  returnKeyType="next"
                  className="min-h-12 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.homeGym')}</Text>
                <View className="flex-row gap-2">
                  {[t('profile.option.yes'), t('profile.option.no')].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setHomeGym(opt === t('profile.option.yes'))}
                      className={`rounded-lg border px-3 py-2 ${homeGym === (opt === t('profile.option.yes')) ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700'}`}
                    >
                      <Text className={homeGym === (opt === t('profile.option.yes')) ? 'text-cyan-200' : 'text-slate-300'}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-xs uppercase text-slate-400">{t('profile.field.goal')}</Text>
                <TextInput
                  value={goal}
                  onChangeText={setGoal}
                  placeholder={t('profile.placeholder.goal')}
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
                    <Text className="text-center font-bold text-white">{saving ? t('profile.button.saveInProgress') : t('profile.button.save')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditing(false)} className="min-h-12 items-center justify-center rounded-xl border border-slate-600 px-4 py-3">
                    <Text className="text-slate-300">{t('profile.button.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="mt-4 gap-2">
                {[
                  [t('profile.field.firstName'), firstName],
                  [t('profile.field.lastName'), lastName],
                  [t('profile.field.email'), userEmail],
                  [t('profile.field.gender'), gender],
                  [t('profile.field.birthDate'), birthDate],
                  [t('profile.field.height'), `${height} cm`],
                  [t('profile.field.weight'), `${weight} kg`],
                  [t('profile.field.homeGym'), homeGym ? t('profile.option.yes') : t('profile.option.no')],
                  [t('profile.field.goal'), goal],
                ].map(([label, value]) => (
                  <View key={label} className="rounded-lg bg-slate-800/80 px-3 py-2">
                    <Text className="text-xs uppercase text-slate-400">{label}</Text>
                    <Text className="text-slate-200">{value || t('profile.field.notSet')}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Settings */}
          <View className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <Text className="text-lg font-bold text-white">{t('profile.section.settings')}</Text>
            <Text className="mt-3 text-xs uppercase text-slate-400">{t('profile.section.language')}</Text>
            <View className="mt-2 flex-row gap-2">
              {[
                { key: 'en' as AppLanguage, label: t('profile.language.english') },
                { key: 'de-CH' as AppLanguage, label: t('profile.language.germanSwiss') },
              ].map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => void setLanguage(option.key)}
                  className={`rounded-lg border px-3 py-2 ${language === option.key ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700'}`}
                >
                  <Text className={language === option.key ? 'text-cyan-200' : 'text-slate-300'}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Password Change Button */}
          <TouchableOpacity 
            onPress={() => setShowPasswordSection(!showPasswordSection)} 
            className="mt-5 rounded-xl border border-sky-500 bg-sky-500/10 py-3"
          >
            <Text className="text-center font-bold text-sky-300">
              {showPasswordSection
                ? `▼ ${t('profile.button.changePasswordClose')}`
                : `▶ ${t('profile.button.changePassword')}`}
            </Text>
          </TouchableOpacity>

          {/* Expandable Password Section */}
          {showPasswordSection && (
            <View className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <Text className="text-lg font-bold text-white">{t('profile.section.password')}</Text>
              
              <Text className="mt-3 text-xs uppercase text-slate-400">{t('profile.field.currentPassword')}</Text>
              <TextInput
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder={t('profile.placeholder.currentPassword')}
                placeholderTextColor="#64748b"
                secureTextEntry
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              
              <Text className="mt-3 text-xs uppercase text-slate-400">{t('profile.field.newPassword')}</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('profile.placeholder.newPassword')}
                placeholderTextColor="#64748b"
                secureTextEntry
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              
              <Text className="mt-3 text-xs uppercase text-slate-400">{t('profile.field.confirmPassword')}</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('profile.placeholder.confirmPassword')}
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
                  {passwordSaving ? t('profile.button.saveInProgress') : t('profile.button.changePassword')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Pressable onPress={signOut} className="mt-5 self-start rounded-lg border border-rose-500 px-4 py-2">
            <Text className="text-rose-300">{t('profile.button.signOut')}</Text>
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
              <Text className="text-center text-slate-300">{t('profile.button.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}