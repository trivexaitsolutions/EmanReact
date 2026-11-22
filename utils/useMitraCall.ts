import { useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { API_URL } from '../constants/api';
import { useI18n } from '../i18n';

type Role = 'customer' | 'workerProfile' | 'workerLogin';
type Coordinates = { latitude: number; longitude: number };
async function currentCoordinates(): Promise<Coordinates | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    if (!(await Location.hasServicesEnabledAsync())) return null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 12000); }),
      ]);
      if (!result) return null;
      const { latitude, longitude } = result.coords;
      return { latitude, longitude };
    } finally { if (timer) clearTimeout(timer); }
  } catch (_) { return null; }
}

export function useMitraCall(role: Role) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const callMitra = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const opts = { timeout: 10000 };
    try {
      let result: any;
      if (role === 'workerProfile') {
        result = (await axios.get(`${API_URL}/worker/support-contact`, opts)).data;
      } else if (role === 'customer') {
        const url = `${API_URL}/user/support-contact`;
        // No location permission needed if an active assigned agent exists.
        result = (await axios.post(url, {}, opts)).data;
        if (!result.contact && result.code === 'LOCATION_REQUIRED') {
          const coords = await currentCoordinates();
          result = (await axios.post(url, coords || { useSavedAddress: true }, opts)).data;
        }
      } else {
        // Login support does not require GPS or a verified Naka.
        result = (await axios.post(`${API_URL}/worker/support-contact/available`, {}, opts)).data;
      }
      const phone = String(result?.contact?.phone || '');
      if (result?.success && /^\+?[1-9]\d{7,14}$/.test(phone)) {
        await Linking.openURL(`tel:${phone}`);
        return;
      }
      const message = result?.code === 'LOCATION_REQUIRED'
        ? 'Enable location access to find a nearby Field Agent.'
        : result?.code === 'NO_ASSIGNED_MITRA' ? 'No assigned Field Agent is available.'
        : result?.code === 'NO_NEARBY_MITRA' ? 'No nearby Field Agent is available.'
        : result?.code === 'NO_AVAILABLE_AGENT' ? 'No Field Agent is currently available.'
        : 'Unable to contact Field Agent. Please try again.';
      Alert.alert(t('Call Field Agent'), t(message));
    } catch (error: any) {
      // The existing auth interceptor handles expired authenticated sessions.
      Alert.alert(t('Call Field Agent'), t(error?.response?.status === 429
        ? 'Too many requests. Please try again later.' : 'Unable to contact Field Agent. Please try again.'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { callMitra, busy };
}
