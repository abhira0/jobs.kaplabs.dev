export type Invite = {
  _id?: string;
  token: string;
  email: string;
  created_by: string;
  created_at: Date | string;
  expires_at: Date | string;
  is_used: boolean;
};


