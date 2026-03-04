"use client";

import React, { useState, useEffect } from "react";

const quotes = [
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "The future depends on what you do today.",
  "It always seems impossible until it's done.",
  "Believe you can and you're halfway there.",
  "Start where you are. Use what you have. Do what you can.",
  "Don't wish it were easier. Wish you were better.",
  "You don't have to be great to start, but you have to start to be great.",
  "The only way to achieve the impossible is to believe it is possible.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Hardships often prepare ordinary people for an extraordinary destiny.",
  "Push yourself, because no one else is going to do it for you.",
  "Don't limit your challenges. Challenge your limits.",
  "Your time is limited, don't waste it living someone else's life.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
];

export function MotivationalQuote() {
  const [quote, setQuote] = useState<string>("");

  useEffect(() => {
    const idx = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[idx]);
  }, []);

  if (!quote) return null;

  return (
    <p className="mt-2 italic text-sm text-accent-foreground/80">"{quote}"</p>
  );
}
