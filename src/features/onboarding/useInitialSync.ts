import { getSyncBundle } from "@/shared/api/endpoints";
import { saveBundle } from "@/shared/storage/bundle";
import { saveOfflineBundle } from "@/shared/storage/offlineData";

export const runInitialSync = async (params: {
  state: string;
  district: string;
  bundleVersion?: string;
}): Promise<string> => {
  const res = await getSyncBundle(
    params.bundleVersion !== undefined
      ? { state: params.state, district: params.district, bundleVersion: params.bundleVersion }
      : { state: params.state, district: params.district },
  );
  await saveBundle(res.bundle_version, res);
  await saveOfflineBundle(res).catch(() => undefined);
  return res.bundle_version;
};
