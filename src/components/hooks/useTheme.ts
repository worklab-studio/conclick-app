import { useState, useEffect } from 'react';

export function useTheme() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        setTheme('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        localStorage.setItem('umami-theme', 'dark');
    }, []);

    const saveTheme = (value: string) => {
        setTheme('dark');
        localStorage.setItem('umami-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
    };

    return { theme, saveTheme };
}
