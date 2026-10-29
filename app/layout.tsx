import type { Metadata } from 'next';
import './globals.css';
import './machine.css';
import './settings.css';
import './dark.css';
import './notifications.css';
import './mobile.css';
import './program.css';

export const metadata: Metadata = {
  title: 'Atlas | Seu treino, no seu ritmo',
  description: 'Registre seus treinos e acompanhe sua evolução.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
