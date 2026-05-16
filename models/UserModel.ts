export type UserModel = {
  farmerId: string;
  name?: string | null;
  email?: string | null;
  preferredLanguage?: string;
};

export type AuthStateModel = {
  farmerId: string | null;
  ready: boolean;
  isAuthenticated: boolean;
};
