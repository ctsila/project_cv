export type UiLang = 'en' | 'ru' | 'es';
export function getUiLang(): UiLang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('uiLanguage');
  return stored === 'ru' || stored === 'es' || stored === 'en' ? stored : 'en';
}
export function setUiLang(lang: UiLang) {
  if (typeof window !== 'undefined') localStorage.setItem('uiLanguage', lang);
}
export const ui = {
  en: { workspace: 'Workspace', dashboard: 'Dashboard', compare: 'CV Generator', profile: 'Career Profile', vacancies: 'Vacancies', history: 'History', tracker: 'Tracker', noLies: 'No Lies Mode', noLiesOn: 'No Lies Mode ON', noLiesOff: 'No Lies Mode OFF', evidence: 'Evidence-backed claims only.', language: 'Web', target: 'Target', saved: 'Saved', saving: 'Saving...', open: 'Open', details: 'Details', generatedCv: 'Generated CV / Resume', coverLetter: 'Generated cover letter', parsedVacancy: 'Parsed vacancy', uploadedCv: 'Uploaded CV text', matchDetails: 'Match details' },
  ru: { workspace: 'Рабочая область', dashboard: 'Панель', compare: 'Генератор CV', profile: 'Профиль карьеры', vacancies: 'Вакансии', history: 'История', tracker: 'Трекер', noLies: 'Режим без выдумок', noLiesOn: 'Без выдумок ВКЛ', noLiesOff: 'Без выдумок ВЫКЛ', evidence: 'Только подтвержденные факты.', language: 'Язык', target: 'Рынок', saved: 'Сохранено', saving: 'Сохранение...', open: 'Открыть', details: 'Детали', generatedCv: 'Созданное резюме', coverLetter: 'Сопроводительное письмо', parsedVacancy: 'Разобранная вакансия', uploadedCv: 'Текст загруженного CV', matchDetails: 'Детали совпадения' },
  es: { workspace: 'Espacio', dashboard: 'Panel', compare: 'Generador de CV', profile: 'Perfil profesional', vacancies: 'Vacantes', history: 'Historial', tracker: 'Seguimiento', noLies: 'Modo sin mentiras', noLiesOn: 'Sin mentiras ON', noLiesOff: 'Sin mentiras OFF', evidence: 'Solo datos verificados.', language: 'Idioma', target: 'Mercado', saved: 'Guardado', saving: 'Guardando...', open: 'Abrir', details: 'Detalles', generatedCv: 'CV generado', coverLetter: 'Carta generada', parsedVacancy: 'Vacante analizada', uploadedCv: 'Texto del CV cargado', matchDetails: 'Detalles de coincidencia' }
};
