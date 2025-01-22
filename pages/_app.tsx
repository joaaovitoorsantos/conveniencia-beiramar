import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from 'react-hot-toast';

// Definir fuso horário padrão para o Brasil
process.env.TZ = 'America/Sao_Paulo';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster 
        position="top-right"
        containerStyle={{
          top: 20,
          right: 20,
        }}
      />
    </>
  );
}
