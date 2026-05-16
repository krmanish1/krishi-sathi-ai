import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { IAccountService } from "./interfaces/IAccountService";
import type { IHttpService } from "./interfaces/IHttpService";
import { getSupabase } from "@/shared/supabase/client";
import { signOutGoogleNative } from "@/shared/supabase/googleSignIn";
import { signOutSocial } from "@/shared/supabase/socialAuth";

@injectable()
export class AccountService implements IAccountService {
  constructor(
    @inject(TYPES.IHttpService) private readonly httpService: IHttpService,
  ) {}

  async signInWithEmail(email: string, password: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string, name: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
    }
  }

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    try { await signOutGoogleNative(); } catch { /* ignore */ }
    try { await signOutSocial(); } catch { /* ignore */ }
    try { await supabase?.auth.signOut({ scope: "local" }); } catch { /* ignore */ }
  }
}
