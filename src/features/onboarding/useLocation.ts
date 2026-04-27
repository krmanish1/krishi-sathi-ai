import * as Location from "expo-location";

export type LocationFailureReason = "services_disabled" | "permission_denied" | "unavailable";

export type DetectLocationResult = {
  state: string | null;
  district: string | null;
  failureReason?: LocationFailureReason;
};

export const detectLocation = async (): Promise<DetectLocationResult> => {
  try {
    let servicesEnabled = await Location.hasServicesEnabledAsync();
    const maybeEnableProvider = (
      Location as unknown as { enableNetworkProviderAsync?: () => Promise<void> }
    ).enableNetworkProviderAsync;
    if (!servicesEnabled && maybeEnableProvider) {
      try {
        await maybeEnableProvider();
        servicesEnabled = await Location.hasServicesEnabledAsync();
      } catch {
        // If user cancels Android location enable prompt, we show fallback UX on screen.
      }
    }
    if (!servicesEnabled) {
      return { state: null, district: null, failureReason: "services_disabled" };
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { state: null, district: null, failureReason: "permission_denied" };
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
  } catch {
    return { state: null, district: null, failureReason: "unavailable" };
  }
};
