import { Card, CardColor, CardValue } from './types';

export const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
export const VALUES: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

export const BG_COLORS: Record<CardColor, string> = {
  red: 'bg-rose-500',
  blue: 'bg-sky-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  wild: 'bg-zinc-800'
};

export const TEXT_COLORS: Record<CardColor, string> = {
  red: 'text-rose-600',
  blue: 'text-sky-600',
  green: 'text-emerald-600',
  yellow: 'text-amber-500',
  wild: 'text-zinc-900'
};

export const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ewan&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=George&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Heidi&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Julia&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Nora&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar&backgroundColor=ffd5dc'
];

export const createFullDeck = (): Card[] => {
  const deck: Card[] = [];
  COLORS.forEach(color => {
    deck.push({ id: `${color}-0-${Math.random()}`, color, value: '0' });
    for (let i = 0; i < 2; i++) {
      VALUES.slice(1).forEach(val => {
        deck.push({ id: `${color}-${val}-${i}-${Math.random()}`, color, value: val });
      });
    }
  });
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${i}-${Math.random()}`, color: 'wild', value: 'wild' });
    deck.push({ id: `draw4-${i}-${Math.random()}`, color: 'wild', value: 'draw4' });
  }
  return deck.sort(() => Math.random() - 0.5);
};