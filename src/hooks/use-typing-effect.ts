'use client';

import { useState, useEffect } from 'react';

export const useTypingEffect = (text: string, duration: number = 50): string => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        setDisplayedText(''); // Reset when text changes
        let i = 0;
        const intervalId = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(intervalId);
            }
        }, duration);

        return () => clearInterval(intervalId);
    }, [text, duration]);

    return displayedText;
};
