import * as Location from "expo-location";

export const detectLocation = async (): Promise<{
  state: string | null;
  district: string | null;
}> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return { state: null, district: null };
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const results = await Location.reverseGeocodeAsync({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  });
  const r = results[0];
  if (!r) {
    return { state: null, district: null };
  }
  const state = r.region ?? null;
  const district = r.subregion ?? r.district ?? r.city ?? null;
  return { state, district };
};
