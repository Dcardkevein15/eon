'use client';

import { useState, useEffect } from 'react';

export const useTypingEffect = (text: string, duration: number = 50): string => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setDisplayedText('');
        setCurrentIndex(0);
    }, [text]);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, duration);

            return () => clearTimeout(timeout);
        }
    }, [currentIndex, duration, text]);

    return displayedText;
};
