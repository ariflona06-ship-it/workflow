'use client';

import { useEffect, useState } from 'react';

const EMOJIS = [
  '🍀', '✨', '⭐', '😁', '🌼', '🪴', '😀', '😃', '😄', '😆',
  '🤗', '🫡', '🤔', '🎈', '🎇', '🎉', '🍨', '🍪', '🍡', '🍰',
  '🍩', '🍒', '🍓', '🍉', '🌺', '🌻',
];

export function WelcomeGreeting({ userName }: { userName: string }) {
  const [randomEmoji, setRandomEmoji] = useState('✨');

  useEffect(() => {
    setRandomEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  }, []);

  return (
    <h2 className="text-3xl font-bold text-foreground mb-1 text-balance">
      Welcome, {userName || 'there'}! {randomEmoji}
    </h2>
  );
}
