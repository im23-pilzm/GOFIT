import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isPrivateIpAddress(hostname: string) {
  if (/^10\./.test(hostname)) {
    return true;
  }

  if (/^192\.168\./.test(hostname)) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,3})\./);
  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return Number.isInteger(secondOctet) && secondOctet >= 16 && secondOctet <= 31;
}

function getBundlerHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) {
    return null;
  }

  try {
    const host = new URL(scriptURL).hostname;
    return LOOPBACK_HOSTNAMES.has(host) ? null : host;
  } catch {
    return null;
  }
}

function getExpoDevHost() {
  const hostFromScript = getBundlerHost();
  if (hostFromScript) {
    return hostFromScript;
  }

  const hostFromConfig = Constants.expoConfig?.hostUri?.split(':')[0];
  if (hostFromConfig && !LOOPBACK_HOSTNAMES.has(hostFromConfig)) {
    return hostFromConfig;
  }

  const linkingUri = Constants.linkingUri;
  if (!linkingUri) {
    return null;
  }

  try {
    const hostFromLinkingUri = new URL(linkingUri).hostname;
    return LOOPBACK_HOSTNAMES.has(hostFromLinkingUri) ? null : hostFromLinkingUri;
  } catch {
    return null;
  }
}

function resolveConfiguredApiBaseUrl() {
  if (!configuredApiBaseUrl || configuredApiBaseUrl.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(configuredApiBaseUrl);
    const expoHost = getExpoDevHost();
    const shouldSyncPrivateHostInDev =
      process.env.NODE_ENV !== 'production' &&
      expoHost &&
      parsed.hostname !== expoHost &&
      (LOOPBACK_HOSTNAMES.has(parsed.hostname) || isPrivateIpAddress(parsed.hostname));

    if (shouldSyncPrivateHostInDev) {
      parsed.hostname = expoHost;
      return trimTrailingSlash(parsed.toString());
    }

    if (!LOOPBACK_HOSTNAMES.has(parsed.hostname) || !expoHost) {
      return trimTrailingSlash(parsed.toString());
    }

    parsed.hostname = expoHost;
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(configuredApiBaseUrl);
  }
}

function getDefaultApiBaseUrl() {
  // Prefer Expo's LAN host on devices and fallback to local hosts for emulators/simulators.
  const expoHost = getExpoDevHost();
  if (expoHost) {
    return `http://${expoHost}:3005`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005';
  }

  return 'http://localhost:3005';
}

export const apiBaseUrl = resolveConfiguredApiBaseUrl() ?? getDefaultApiBaseUrl();

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  accessToken?: string
): Promise<T> {
  // Send a JSON request to the backend and surface API errors with readable messages.
  const { timeoutMs = 12000, ...requestInit } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestInit.headers ?? {}),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const requestUrl = `${apiBaseUrl}${path}`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...requestInit,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request to ${requestUrl} timed out after ${Math.round(timeoutMs / 1000)}s. Please check your API connection.`
      );
    }

    if (error instanceof Error) {
      throw new Error(`Unable to reach API at ${apiBaseUrl}. ${error.message}`);
    }

    throw new Error(`Unable to reach API at ${apiBaseUrl}.`);
  } finally {
    clearTimeout(timeoutHandle);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload ?? (null as T)) as T;
}