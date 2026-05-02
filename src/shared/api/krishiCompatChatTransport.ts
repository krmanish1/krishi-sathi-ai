import {
  asSchema,
  type FlexibleSchema,
  EventSourceParserStream,
  validateTypes,
} from "@ai-sdk/provider-utils";
import {
  HttpChatTransport,
  uiMessageChunkSchema,
  type HttpChatTransportInitOptions,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import {
  createLegacyUiStreamNormalizeState,
  normalizeLegacyUiStreamChunk,
} from "@/shared/api/legacyUiStreamNormalize";

/**
 * Same as DefaultChatTransport, but tolerates backend SSE chunks that omit
 * `text-start` and `id` on `text-delta` (AI SDK 6 requires both).
 */
export class KrishiCompatChatTransport<UI_MESSAGE extends UIMessage> extends HttpChatTransport<UI_MESSAGE> {
  constructor(options: HttpChatTransportInitOptions<UI_MESSAGE> = {}) {
    super(options);
  }

  protected processResponseStream(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<UIMessageChunk> {
    const normalizeState = createLegacyUiStreamNormalizeState();
    const chunkSchema = asSchema(
      uiMessageChunkSchema as unknown as FlexibleSchema<UIMessageChunk>,
    );

    return stream
      .pipeThrough(new TextDecoderStream() as Parameters<
        ReadableStream<Uint8Array>["pipeThrough"]
      >[0])
      .pipeThrough(new EventSourceParserStream())
      .pipeThrough(
        new TransformStream<{ data: string | undefined }, UIMessageChunk>({
          transform: async (event, controller) => {
            const data = event.data;
            if (data === "[DONE]" || data == null || data === "") {
              return;
            }
            let raw: unknown;
            try {
              raw = JSON.parse(data);
            } catch {
              return;
            }
            const chunks = normalizeLegacyUiStreamChunk(raw, normalizeState);
            for (const chunk of chunks) {
              const validated = await validateTypes({
                value: chunk,
                schema: chunkSchema,
              });
              controller.enqueue(validated as UIMessageChunk);
            }
          },
        }),
      );
  }
}
