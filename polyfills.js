import { Platform } from "react-native";
import structuredClone from "@ungap/structured-clone";

/**
 * AI SDK expects structuredClone + TextEncoderStream/TextDecoderStream on RN.
 * See https://ai-sdk.dev/docs/getting-started/expo
 */
if (Platform.OS !== "web") {
  const setupPolyfills = async () => {
    const { polyfillGlobal } = await import(
      "react-native/Libraries/Utilities/PolyfillFunctions"
    );
    const { TextEncoderStream, TextDecoderStream } = await import(
      "@stardazed/streams-text-encoding"
    );

    if (!("structuredClone" in globalThis)) {
      polyfillGlobal("structuredClone", () => structuredClone);
    }

    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
  };

  void setupPolyfills();
}

export {};
