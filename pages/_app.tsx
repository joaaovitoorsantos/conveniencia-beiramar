import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Conveniência</title>
      </Head>
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
