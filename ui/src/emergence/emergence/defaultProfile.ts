const STORAGE_KEY = "defaultProfile";

export interface DefaultProfileData {
  nickname: string;
  avatar: Uint8Array | undefined;
}

export function saveDefaultProfile(data: DefaultProfileData): void {
  const serializable = {
    nickname: data.nickname,
    avatar: data.avatar ? Array.from(data.avatar) : undefined,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

export function loadDefaultProfile(): DefaultProfileData | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return {
      nickname: parsed.nickname,
      avatar: parsed.avatar ? new Uint8Array(parsed.avatar) : undefined,
    };
  } catch {
    return null;
  }
}

export function clearDefaultProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
