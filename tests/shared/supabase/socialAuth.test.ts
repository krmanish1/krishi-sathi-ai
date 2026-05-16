jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "exp://127.0.0.1:8081/--/auth-callback"),
}));
jest.mock("expo-auth-session/build/QueryParams", () => ({
  getQueryParams(input: string) {
    const url = new URL(input);
    const errorCode = url.searchParams.get("errorCode");
    const params: Record<string, string> = Object.fromEntries(url.searchParams.entries());
    if (errorCode) delete params.errorCode;
    if (url.hash) {
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      hash.forEach((value, key) => { params[key] = value; });
    }
    return { params, errorCode };
  },
}));
jest.mock("@/shared/supabase/client", () => ({ getSupabase: jest.fn() }));

import { createSessionFromAuthUrl } from "@/shared/supabase/socialAuth";
import { getSupabase } from "@/shared/supabase/client";

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

describe("createSessionFromAuthUrl", () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        setSession: jest.fn().mockResolvedValue({ error: null }),
      },
    } as never);
  });

  it("throws when OAuth returns error params", async () => {
    await expect(
      createSessionFromAuthUrl(
        "https://oauth.local/callback?error=access_denied&error_description=User+cancelled",
      ),
    ).rejects.toThrow("User cancelled");
  });

  it("throws when redirect has no code or tokens", async () => {
    await expect(createSessionFromAuthUrl("https://oauth.local/callback")).rejects.toThrow(
      /exact redirect URL/,
    );
  });

  it("exchanges PKCE code when present", async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({
      auth: { exchangeCodeForSession, setSession: jest.fn() },
    } as never);

    await createSessionFromAuthUrl("https://oauth.local/callback?code=abc123");

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
  });
});
