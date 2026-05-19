import './globals.css';
import Providers from '@/components/Providers';
export const metadata={title:'AI Resume Generator',description:'Truthful AI resume and cover letter tailoring with localization and explainability.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
