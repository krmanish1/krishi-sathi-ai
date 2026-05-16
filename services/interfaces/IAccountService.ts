export interface IAccountService {
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string, name: string): Promise<void>;
  signOut(): Promise<void>;
}
