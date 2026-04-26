import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'app_language_v1';

const SUPPORTED_LANGUAGES = ['en', 'de-CH'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

type TranslationKey =
  | 'profile.title'
  | 'profile.section.profileData'
  | 'profile.section.settings'
  | 'profile.section.language'
  | 'profile.section.password'
  | 'profile.section.deleteAccount'
  | 'profile.button.edit'
  | 'profile.button.cancel'
  | 'profile.button.save'
  | 'profile.button.saveInProgress'
  | 'profile.button.signOut'
  | 'profile.button.close'
  | 'profile.button.changePassword'
  | 'profile.button.changePasswordClose'
  | 'profile.button.deleteAccount'
  | 'profile.button.deleteAccountInProgress'
  | 'profile.field.firstName'
  | 'profile.field.lastName'
  | 'profile.field.email'
  | 'profile.field.gender'
  | 'profile.field.birthDate'
  | 'profile.field.height'
  | 'profile.field.weight'
  | 'profile.field.homeGym'
  | 'profile.field.goal'
  | 'profile.field.notSet'
  | 'profile.field.currentPassword'
  | 'profile.field.newPassword'
  | 'profile.field.confirmPassword'
  | 'profile.placeholder.firstName'
  | 'profile.placeholder.lastName'
  | 'profile.placeholder.goal'
  | 'profile.placeholder.currentPassword'
  | 'profile.placeholder.newPassword'
  | 'profile.placeholder.confirmPassword'
  | 'profile.language.english'
  | 'profile.language.germanSwiss'
  | 'profile.gender.male'
  | 'profile.gender.female'
  | 'profile.gender.other'
  | 'profile.option.yes'
  | 'profile.option.no'
  | 'profile.alert.error'
  | 'profile.alert.success'
  | 'profile.alert.saved'
  | 'profile.alert.profileUpdated'
  | 'profile.alert.passwordUpdated'
  | 'profile.alert.deleteAccountConfirmTitle'
  | 'profile.alert.deleteAccountConfirmMessage'
  | 'profile.alert.deleteAccountConfirmAction'
  | 'profile.alert.deleteAccountSuccessTitle'
  | 'profile.alert.deleteAccountSuccessMessage'
  | 'profile.alert.missingCurrentPassword'
  | 'profile.alert.passwordTooShort'
  | 'profile.alert.passwordMismatch'
  | 'profile.alert.passwordMustDiffer'
  | 'profile.alert.invalidCurrentPassword'
  | 'profile.alert.passwordChangeFailed'
  | 'profile.alert.profileSaveFailed'
  | 'profile.alert.deleteAccountFailed';

type TranslationMap = Record<TranslationKey, string>;

const translations: Record<AppLanguage, TranslationMap> = {
  en: {
    'profile.title': 'My Profile',
    'profile.section.profileData': 'Profile Data',
    'profile.section.settings': 'Settings',
    'profile.section.language': 'Language',
    'profile.section.password': 'Change Password',
    'profile.section.deleteAccount': 'Delete Account',
    'profile.button.edit': 'Edit',
    'profile.button.cancel': 'Cancel',
    'profile.button.save': 'Save',
    'profile.button.saveInProgress': 'Saving...',
    'profile.button.signOut': 'Sign Out',
    'profile.button.close': 'Close',
    'profile.button.changePassword': 'Change Password',
    'profile.button.changePasswordClose': 'Close Password Change',
    'profile.button.deleteAccount': 'Delete Account',
    'profile.button.deleteAccountInProgress': 'Deleting account...',
    'profile.field.firstName': 'First Name',
    'profile.field.lastName': 'Last Name',
    'profile.field.email': 'Email',
    'profile.field.gender': 'Gender',
    'profile.field.birthDate': 'Birth Date',
    'profile.field.height': 'Height',
    'profile.field.weight': 'Weight',
    'profile.field.homeGym': 'Home Gym',
    'profile.field.goal': 'Goal',
    'profile.field.notSet': 'Not set',
    'profile.field.currentPassword': 'Current Password',
    'profile.field.newPassword': 'New Password',
    'profile.field.confirmPassword': 'Confirm New Password',
    'profile.placeholder.firstName': 'First Name',
    'profile.placeholder.lastName': 'Last Name',
    'profile.placeholder.goal': 'Goal',
    'profile.placeholder.currentPassword': 'Enter current password',
    'profile.placeholder.newPassword': 'New password (min. 8 chars)',
    'profile.placeholder.confirmPassword': 'Repeat new password',
    'profile.language.english': 'English',
    'profile.language.germanSwiss': 'German (Swiss)',
    'profile.gender.male': 'Male',
    'profile.gender.female': 'Female',
    'profile.gender.other': 'Other',
    'profile.option.yes': 'Yes',
    'profile.option.no': 'No',
    'profile.alert.error': 'Error',
    'profile.alert.success': 'Success',
    'profile.alert.saved': 'Saved',
    'profile.alert.profileUpdated': 'Profile updated.',
    'profile.alert.passwordUpdated': 'Password was updated.',
    'profile.alert.deleteAccountConfirmTitle': 'Delete account',
    'profile.alert.deleteAccountConfirmMessage': 'Do you really want to permanently delete your account? This cannot be undone.',
    'profile.alert.deleteAccountConfirmAction': 'Delete',
    'profile.alert.deleteAccountSuccessTitle': 'Account deleted',
    'profile.alert.deleteAccountSuccessMessage': 'Your account has been deleted.',
    'profile.alert.missingCurrentPassword': 'Please enter your current password.',
    'profile.alert.passwordTooShort': 'New password must have at least 8 characters.',
    'profile.alert.passwordMismatch': 'The new passwords do not match.',
    'profile.alert.passwordMustDiffer': 'The new password must differ from the old password.',
    'profile.alert.invalidCurrentPassword': 'Current password is incorrect.',
    'profile.alert.passwordChangeFailed': 'Password could not be changed.',
    'profile.alert.profileSaveFailed': 'Saving failed.',
    'profile.alert.deleteAccountFailed': 'Account could not be deleted.',
  },
  'de-CH': {
    'profile.title': 'Mein Profil',
    'profile.section.profileData': 'Profildaten',
    'profile.section.settings': 'Einstellungen',
    'profile.section.language': 'Sprache',
    'profile.section.password': 'Passwort ändern',
    'profile.section.deleteAccount': 'Konto löschen',
    'profile.button.edit': 'Bearbeiten',
    'profile.button.cancel': 'Abbrechen',
    'profile.button.save': 'Speichern',
    'profile.button.saveInProgress': 'Speichert...',
    'profile.button.signOut': 'Abmelden',
    'profile.button.close': 'Schliessen',
    'profile.button.changePassword': 'Passwort ändern',
    'profile.button.changePasswordClose': 'Passwort ändern schliessen',
    'profile.button.deleteAccount': 'Konto löschen',
    'profile.button.deleteAccountInProgress': 'Konto wird gelöscht...',
    'profile.field.firstName': 'Vorname',
    'profile.field.lastName': 'Nachname',
    'profile.field.email': 'E-Mail',
    'profile.field.gender': 'Geschlecht',
    'profile.field.birthDate': 'Geburtsdatum',
    'profile.field.height': 'Grösse',
    'profile.field.weight': 'Gewicht',
    'profile.field.homeGym': 'Heimstudio',
    'profile.field.goal': 'Ziel',
    'profile.field.notSet': 'Nicht gesetzt',
    'profile.field.currentPassword': 'Aktuelles Passwort',
    'profile.field.newPassword': 'Neues Passwort',
    'profile.field.confirmPassword': 'Neues Passwort bestätigen',
    'profile.placeholder.firstName': 'Vorname',
    'profile.placeholder.lastName': 'Nachname',
    'profile.placeholder.goal': 'Ziel',
    'profile.placeholder.currentPassword': 'Aktuelles Passwort eingeben',
    'profile.placeholder.newPassword': 'Neues Passwort (min. 8 Zeichen)',
    'profile.placeholder.confirmPassword': 'Neues Passwort wiederholen',
    'profile.language.english': 'Englisch',
    'profile.language.germanSwiss': 'Deutsch (Schweiz)',
    'profile.gender.male': 'Männlich',
    'profile.gender.female': 'Weiblich',
    'profile.gender.other': 'Sonstiges',
    'profile.option.yes': 'Ja',
    'profile.option.no': 'Nein',
    'profile.alert.error': 'Fehler',
    'profile.alert.success': 'Erfolg',
    'profile.alert.saved': 'Gespeichert',
    'profile.alert.profileUpdated': 'Profil aktualisiert.',
    'profile.alert.passwordUpdated': 'Passwort wurde aktualisiert.',
    'profile.alert.deleteAccountConfirmTitle': 'Konto löschen',
    'profile.alert.deleteAccountConfirmMessage': 'Möchtest du dein Konto wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.',
    'profile.alert.deleteAccountConfirmAction': 'Löschen',
    'profile.alert.deleteAccountSuccessTitle': 'Konto gelöscht',
    'profile.alert.deleteAccountSuccessMessage': 'Dein Konto wurde gelöscht.',
    'profile.alert.missingCurrentPassword': 'Bitte gib dein aktuelles Passwort ein.',
    'profile.alert.passwordTooShort': 'Neues Passwort muss mindestens 8 Zeichen haben.',
    'profile.alert.passwordMismatch': 'Die neuen Passwörter stimmen nicht überein.',
    'profile.alert.passwordMustDiffer': 'Das neue Passwort muss sich vom alten unterscheiden.',
    'profile.alert.invalidCurrentPassword': 'Aktuelles Passwort ist falsch.',
    'profile.alert.passwordChangeFailed': 'Passwort konnte nicht geändert werden.',
    'profile.alert.profileSaveFailed': 'Speichern fehlgeschlagen.',
    'profile.alert.deleteAccountFailed': 'Konto konnte nicht gelöscht werden.',
  },
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (nextLanguage: AppLanguage) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('de-CH');

  useEffect(() => {
    const loadStoredLanguage = async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (!stored || !SUPPORTED_LANGUAGES.includes(stored as AppLanguage)) {
        return;
      }
      setLanguageState(stored as AppLanguage);
    };

    void loadStoredLanguage();
  }, []);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(() => {
    const dict = translations[language];

    return {
      language,
      setLanguage,
      t: (key) => dict[key],
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }

  return context;
}
