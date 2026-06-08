import { toNativeFilesystemPath } from "@/shared/ondevice/nativeModelPath";

describe("toNativeFilesystemPath", () => {
  it("strips file:// prefix for Android document paths", () => {
    expect(
      toNativeFilesystemPath(
        "file:///data/user/0/ai.krishisaathi.app/files/gemma-4-E2B-it.litertlm",
      ),
    ).toBe("/data/user/0/ai.krishisaathi.app/files/gemma-4-E2B-it.litertlm");
  });

  it("leaves plain paths unchanged", () => {
    expect(toNativeFilesystemPath("/data/local/tmp/gemma-4-E2B-it.litertlm")).toBe(
      "/data/local/tmp/gemma-4-E2B-it.litertlm",
    );
  });
});
