'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@teamhanko/hanko-elements';

const hankoApi = process.env.NEXT_PUBLIC_HANKO_API_URL || '';

export function HankoAuth() {
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState(false);

    const redirectAfterLogin = useCallback(() => {
        router.push('/websites');
    }, [router]);

    useEffect(() => {
        // Register the Hanko elements
        register(hankoApi).catch((error) => {
            console.error('Failed to register Hanko elements:', error);
        });

        setIsLoaded(true);
    }, []);

    useEffect(() => {
        // Listen for successful authentication
        const handleAuthSuccess = () => {
            redirectAfterLogin();
        };

        document.addEventListener('hankoAuthSuccess', handleAuthSuccess);

        return () => {
            document.removeEventListener('hankoAuthSuccess', handleAuthSuccess);
        };
    }, [redirectAfterLogin]);

    if (!hankoApi) {
        return (
            <div className="text-red-500 text-center p-4">
                Hanko API URL is not configured. Please set NEXT_PUBLIC_HANKO_API_URL in your environment.
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <style jsx global>{`
        hanko-auth {
          --color: #fafafa;
          --color-shade-1: #a1a1aa;
          --color-shade-2: #71717a;
          --brand-color: #6366f1;
          --brand-color-shade-1: #4f46e5;
          --brand-contrast-color: #ffffff;
          --background-color: transparent;
          --error-color: #ef4444;
          --link-color: #6366f1;
          --font-family: Inter, system-ui, sans-serif;
          --font-size: 14px;
          --font-weight: 400;
          --headline-font-size: 24px;
          --headline-font-weight: 700;
          --border-radius: 8px;
          --item-height: 44px;
          --item-margin: 12px 0;
          --container-padding: 0;
          --container-max-width: 100%;
          --input-min-width: 0;
          --button-min-width: 0;
        }

        hanko-auth::part(container) {
          background: transparent;
        }

        hanko-auth::part(headline1) {
          color: #fafafa;
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 24px;
        }

        hanko-auth::part(input) {
          background-color: hsl(0 0% 8%);
          border: 1px solid hsl(0 0% 14.9%);
          border-radius: 8px;
          color: #fafafa;
          padding: 12px;
        }

        hanko-auth::part(input):focus {
          border-color: #6366f1;
          outline: none;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        hanko-auth::part(button) {
          background-color: #6366f1;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          padding: 12px;
          transition: background-color 0.2s;
        }

        hanko-auth::part(button):hover {
          background-color: #4f46e5;
        }

        hanko-auth::part(secondary-button) {
          background-color: transparent;
          border: 1px solid hsl(0 0% 14.9%);
          border-radius: 8px;
          color: #fafafa;
        }

        hanko-auth::part(secondary-button):hover {
          background-color: hsl(0 0% 12%);
        }

        hanko-auth::part(link) {
          color: #6366f1;
        }

        hanko-auth::part(link):hover {
          color: #818cf8;
        }

        hanko-auth::part(divider) {
          color: #52525b;
        }

        hanko-auth::part(error) {
          color: #ef4444;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          padding: 12px;
        }
      `}</style>
            {isLoaded && <hanko-auth />}
        </div>
    );
}

// TypeScript declaration for custom element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'hanko-auth': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}
