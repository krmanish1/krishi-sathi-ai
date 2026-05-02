import * as Location from "expo-location";

export type LocationFailureReason = "services_disabled" | "permission_denied" | "unavailable";

export type DetectLocationResult = {
  state: string | null;
  district: string | null;
  /** WGS84 from the device fix when a position was obtained (before or after geocode). */
  latitude?: number | null;
  longitude?: number | null;
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

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const latitude = pos.coords.latitude;
    const longitude = pos.coords.longitude;

    let results: Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>;
    try {
      results = await Location.reverseGeocodeAsync({ latitude, longitude });
    } catch {
      return {
        state: null,
        district: null,
        latitude,
        longitude,
        failureReason: "unavailable",
      };
    }

    const r = results[0];
    if (!r) {
      return { state: null, district: null, latitude, longitude };
    }
    const state = r.region ?? null;
    const districtRaw = r as { district?: string | null; subregion?: string | null; city?: string | null; name?: string | null };
    const district =
      (typeof districtRaw.district === "string" && districtRaw.district.trim()
        ? districtRaw.district
        : null) ??
      districtRaw.subregion ??
      districtRaw.city ??
      districtRaw.name ??
      null;
    return { state, district, latitude, longitude };
  } catch {
    return { state: null, district: null, failureReason: "unavailable" };
  }
};
