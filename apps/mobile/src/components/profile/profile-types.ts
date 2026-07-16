export type ProfileData = {
  id?: string;
  _id?: string;
  display_name?: string | null;
  fullName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  email?: string;
  role?: string;
};

export type PickedAvatar = { uri: string; name: string; type: string };
