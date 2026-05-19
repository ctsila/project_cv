export function isOAuthConfigured(provider: 'google' | 'linkedin' | 'yandex' | 'hh') {
  const map = {
    google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    yandex: ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET'],
    hh: ['HH_CLIENT_ID', 'HH_CLIENT_SECRET'],
  } as const;
  return map[provider].every((key) => Boolean(process.env[key] && process.env[key] !== 'missing'));
}

export function oauthStatus() {
  return {
    google: isOAuthConfigured('google'),
    linkedin: isOAuthConfigured('linkedin'),
    yandex: isOAuthConfigured('yandex'),
    hh: isOAuthConfigured('hh'),
  };
}
