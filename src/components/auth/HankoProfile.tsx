'use client';

import { useEffect, useState } from 'react';
import { register } from '@teamhanko/hanko-elements';

const hankoApi = process.env.NEXT_PUBLIC_HANKO_API_URL || '';

export function HankoProfile() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        register(hankoApi).catch((error) => {
            console.error('Failed to register Hanko elements:', error);
        });

        setIsLoaded(true);
    }, []);

    if (!hankoApi) {
        return (
            <div className="text-red-500 text-center p-4">
                Hanko API URL is not configured.
            </div>
        );
    }

    return (
        <div className="w-full">
            <style jsx global>{`
        hanko-profile {
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
          --headline-font-size: 18px;
          --headline-font-weight: 600;
          --border-radius: 8px;
          --item-height: 44px;
          --item-margin: 12px 0;
          --container-padding: 0;
          --container-max-width: 100%;
        }

        hanko-profile::part(container) {
          background: transparent;
        }

        hanko-profile::part(headline1),
        hanko-profile::part(headline2) {
          color: #fafafa;
        }

        hanko-profile::part(input) {
          background-color: hsl(0 0% 8%);
          border: 1px solid hsl(0 0% 14.9%);
          border-radius: 8px;
          color: #fafafa;
          padding: 12px;
        }

        hanko-profile::part(input):focus {
          border-color: #6366f1;
          outline: none;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        hanko-profile::part(button) {
          background-color: #6366f1;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          padding: 10px 16px;
          transition: background-color 0.2s;
        }

        hanko-profile::part(button):hover {
          background-color: #4f46e5;
        }

        hanko-profile::part(secondary-button) {
          background-color: transparent;
          border: 1px solid hsl(0 0% 14.9%);
          border-radius: 8px;
          color: #fafafa;
        }

        hanko-profile::part(secondary-button):hover {
          background-color: hsl(0 0% 12%);
        }

        hanko-profile::part(link) {
          color: #6366f1;
        }

        hanko-profile::part(paragraph) {
          color: #a1a1aa;
        }

        hanko-profile::part(list-item) {
          border-bottom: 1px solid hsl(0 0% 12%);
        }
      `}</style>
            {isLoaded && <hanko-profile />}
        </div>
    );
}

// TypeScript declaration for custom element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'hanko-profile': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}
