import { getSyncBundle } from "@/shared/api/endpoints";
import { saveBundle } from "@/shared/storage/bundle";

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
  return res.bundle_version;
};
