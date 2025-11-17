export type UserRole = "user" | "admin";

export type User = {
  _id?: string;
  username: string;
  email: string;
  name?: string;
  role: UserRole;
  created_at: Date | string;
  updated_at: Date | string;
  password_salt?: string;
  password_hash?: string;
};

export type Session = {
  _id?: string;
  user_id: string;
  token: string;
  created_at: Date | string;
  expires_at: Date | string;
};


