# Image Upload in Chat — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

## Summary

Wire up the existing `postQueryImage` API endpoint (`POST /api/v1/query/image`) into the chat screen with a WhatsApp-style input bar and image preview. Farmers can attach a photo (camera or gallery), optionally type a message, and send both together. The backend receives the `image_ref` alongside the text query.

---

## Architecture & Components

### New files

| File | Purpose |
|------|---------|
| `src/features/chat/guessImagePurpose.ts` | Pure function: `(text: string) => "crop_disease" \| "soil_photo" \| "pest_id"` |
| `src/features/chat/guessImagePurpose.test.ts` | Unit tests for purpose detection |
| `src/features/chat/useImageAttachment.ts` | Hook: image picking + upload state |

### Changed files

| File | Change |
|------|--------|
| `src/features/chat/index.ts` | Export new hook + function |
| `app/(tabs)/chat.tsx` | WhatsApp-style input bar, preview strip, image bubbles |
| `src/shared/i18n/locales/en.json` | New image UI keys |
| `src/shared/i18n/locales/hi.json` | Hindi parity for new keys |

### No DB changes

`ChatMessageRow` stores text only. The image thumbnail in the user bubble is rendered from the **local URI held in component state** during the send — not persisted. Same pattern as WhatsApp.

---

## Data Flow

```
User taps 📎 (gallery) or 📷 (camera)
  → expo-image-picker opens (mediaTypes: Images, quality: 0.7)
  → pickedUri saved in useImageAttachment state
  → preview strip renders above input bar

User types optional text + taps Send
  → guessImagePurpose(draftText) → purpose
  → postQueryImage({ uri, farmerId, purpose }) → { image_ref }
  → useSendChatMessage({ text, imageRef: image_ref, ... })
  → backend receives image_ref + text via existing /api/v1/query
  → reply rendered in chat

Upload happens at send time (not on pick) — avoids wasted uploads.
```

---

## `useImageAttachment` Hook

```ts
{
  pickedUri: string | null
  uploadedRef: string | null
  isUploading: boolean
  uploadError: string | null
  pickImage: (source: "camera" | "gallery") => Promise<void>
  clearImage: () => void
}
```

Upload is triggered from the hook when `send` is called — the hook exposes an `upload(farmerId, purpose)` method that returns `image_ref`.

---

## `guessImagePurpose` Logic

Simple keyword match against the draft text (case-insensitive, multilingual):

| Keywords | Purpose |
|----------|---------|
| soil, mitti, मिट्टी, माटी | `soil_photo` |
| pest, kida, कीड़ा, insect, bug, kirda | `pest_id` |
| anything else | `crop_disease` (default) |

---

## UI — WhatsApp Style

### Input bar
```
[ 📎 ] [ text input .................. ] [ 📷 ] [ ▶ ]
```
- 📎 = gallery, 📷 = camera
- Send button enabled when text is non-empty OR image is attached
- During upload: send button shows `ActivityIndicator` spinner
- Chat bubbles get WhatsApp-style tails; user = right/green, assistant = left/white

### Image preview strip (above input, when image picked)
```
[ thumbnail 60×60 ]  ×
```
- Tapping ✕ clears `pickedUri` and `uploadedRef`

### User message bubble (when image sent)
```
┌──────────────────────────┐
│  [image 200×150]         │
│  optional text below     │
└──────────────────────────┘
```
Thumbnail rendered from local URI. If no text, image-only bubble shown.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Upload fails | Inline banner above input: "Image upload failed. Try again or remove image." |
| Offline + image attached | Toast: "Image analysis requires internet connection" |
| Send disabled during upload | No double-submit possible |
| User clears image | Clears error + preview, text-only send resumes normally |

---

## i18n Keys (new)

```json
"chat.attachImage": "Attach image",
"chat.takePhoto": "Take photo",
"chat.removeImage": "Remove image",
"chat.imageUploadFailed": "Image upload failed. Try again or remove image.",
"chat.imageRequiresInternet": "Image analysis requires internet connection."
```

Both `en.json` and `hi.json` required (parity test enforces this).

---

## Testing

- `guessImagePurpose.test.ts` — keyword inputs → expected purpose (mirrors `guessDeviceIntent.test.ts` pattern)
- Existing `useSendQuery` tests unaffected — `imageRef` was already typed on `SendQueryInput`
