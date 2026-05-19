'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type WebLanguage = 'en' | 'ru' | 'es';

const STORAGE_KEY = 'ai-resume-web-language';

const WebLanguageContext = createContext<{
	language: WebLanguage;
	setLanguage: (language: WebLanguage) => void;
}>({
	language: 'en',
	setLanguage: () => {},
});

export function WebLanguageProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguage] = useState<WebLanguage>('en');

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const stored = window.localStorage.getItem(STORAGE_KEY) as WebLanguage | null;
		if (stored === 'en' || stored === 'ru' || stored === 'es') setLanguage(stored);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(STORAGE_KEY, language);
	}, [language]);

	const value = useMemo(() => ({ language, setLanguage }), [language]);

	return <WebLanguageContext.Provider value={value}>{children}</WebLanguageContext.Provider>;
}

export function useWebLanguage() {
	return useContext(WebLanguageContext);
}
