import React from 'react';
import { AuthProvider } from '@site/src/context/AuthContext';
import Chatbot from '@site/src/components/Chatbot';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <>
        {children}
        <Chatbot />
      </>
    </AuthProvider>
  );
}
