import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { GameState, Player, CardColor } from './types';
import { createFullDeck, AVATARS } from './constants';
import { canPlayCard, getNextTurnIndex, shuffle } from './gameLogic';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

const App: React.FC = () => {
  const [user, setUser] = useState<{ id: string; name: string; avatarUrl: string } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('uno_player_id');
    const id = savedId || Math.random().toString(36).substr(2, 9);
    if (!savedId) localStorage.setItem('uno_player_id', id);
    
    const savedName = localStorage.getItem('uno_player_name') || `Player_${id.substr(0, 4)}`;
    const savedAvatar = localStorage.getItem('uno_player_avatar') || AVATARS[Math.floor(Math.random() * AVATARS.length)];
    
    setUser({ id, name: savedName, avatarUrl: savedAvatar });
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const unsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data() as GameState);
      } else {
        setError('Room closed');
        setRoomId(null);
      }
    });

    return () => unsub();
  }, [roomId]);

  const handleAvatarChange = (url: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatarUrl: url };
    setUser(updatedUser);
    localStorage.setItem('uno_player_avatar', url);
  };

  const handleCreateRoom = async (name: string) => {
    const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();
    const newPlayer: Player = { id: user!.id, name, avatarUrl: user!.avatarUrl, hand: [], isUno: false, ready: true };
    
    const initialState: GameState = {
      roomId: newRoomId,
      players: [newPlayer],
      status: 'lobby',
      currentCard: null,
      discardPile: [],
      drawPile: [],
      turnIndex: 0,
      direction: 1,
      winner: null,
      pendingDraw: 0,
      activeColor: null,
      logs: [`✨ ${name} created match ${newRoomId}`]
    };

    try {
      await setDoc(doc(db, 'rooms', newRoomId), initialState);
      setRoomId(newRoomId);
      localStorage.setItem('uno_player_name', name);
    } catch (err) {
      setError('Connection failed');
    }
  };

  const handleJoinRoom = async (code: string, name: string) => {
    const roomRef = doc(db, 'rooms', code);
    const docSnap = await getDoc(roomRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as GameState;
      if (data.status !== 'lobby') {
        setError('Match in progress');
        return;
      }
      if (data.players.length >= 6) {
        setError('Match full');
        return;
      }

      const newPlayer: Player = { id: user!.id, name, avatarUrl: user!.avatarUrl, hand: [], isUno: false, ready: true };
      await updateDoc(roomRef, {
        players: [...data.players, newPlayer],
        logs: [...data.logs, `👋 ${name} joined`]
      });
      setRoomId(code);
      localStorage.setItem('uno_player_name', name);
    } else {
      setError('Invalid code');
    }
  };

  const startGame = async () => {
    if (!gameState || !roomId) return;
    const deck = createFullDeck();
    const players = [...gameState.players];
    players.forEach(p => { p.hand = deck.splice(0, 7); p.isUno = false; });

    let topCard = deck.pop()!;
    const numericValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    while (!numericValues.includes(topCard.value) || topCard.color === 'wild') {
      deck.unshift(topCard);
      topCard = deck.pop()!;
    }

    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'playing',
      players,
      drawPile: deck,
      currentCard: topCard,
      discardPile: [topCard],
      logs: [...gameState.logs, '🚀 Game Started!']
    });
  };

  const playCard = async (cardIndex: number, pickedColor?: CardColor) => {
    if (!gameState || !roomId || !user) return;
    const currentPlayer = gameState.players[gameState.turnIndex];
    if (currentPlayer.id !== user.id) return;

    const card = currentPlayer.hand[cardIndex];
    if (!canPlayCard(card, gameState.currentCard, gameState.activeColor, gameState.pendingDraw)) return;

    let newPlayers = [...gameState.players];
    newPlayers[gameState.turnIndex].hand.splice(cardIndex, 1);
    
    let nextTurn = gameState.turnIndex;
    let nextDirection = gameState.direction;
    let nextPendingDraw = gameState.pendingDraw;
    let newLogs = [...gameState.logs, `🃏 ${user.name} played ${card.color} ${card.value}`];

    if (card.value === 'skip') {
      nextTurn = getNextTurnIndex(nextTurn, newPlayers.length, nextDirection);
    } else if (card.value === 'reverse') {
      if (newPlayers.length === 2) {
        nextTurn = getNextTurnIndex(nextTurn, newPlayers.length, nextDirection);
      } else {
        nextDirection = (nextDirection === 1 ? -1 : 1) as 1 | -1;
      }
    } else if (card.value === 'draw2') nextPendingDraw += 2;
    else if (card.value === 'draw4') nextPendingDraw += 4;

    if (newPlayers[gameState.turnIndex].hand.length === 0) {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'ended', winner: user.name });
      return;
    }

    nextTurn = getNextTurnIndex(nextTurn, newPlayers.length, nextDirection);

    await updateDoc(doc(db, 'rooms', roomId), {
      players: newPlayers,
      currentCard: card,
      discardPile: [card, ...gameState.discardPile],
      turnIndex: nextTurn,
      direction: nextDirection,
      pendingDraw: nextPendingDraw,
      activeColor: (card.color === 'wild' || card.value === 'draw4') ? pickedColor : null,
      logs: newLogs
    });
  };

  const drawCard = async () => {
    if (!gameState || !roomId || !user) return;
    const currentPlayer = gameState.players[gameState.turnIndex];
    if (currentPlayer.id !== user.id) return;

    let newPlayers = [...gameState.players];
    let newDrawPile = [...gameState.drawPile];
    let newDiscardPile = [...gameState.discardPile];

    if (newDrawPile.length <= Math.max(1, gameState.pendingDraw)) {
      const top = newDiscardPile.shift()!;
      newDrawPile = shuffle([...newDiscardPile]);
      newDiscardPile = [top];
    }

    const cardsToDrawCount = gameState.pendingDraw || 1;
    newPlayers[gameState.turnIndex].hand.push(...newDrawPile.splice(0, cardsToDrawCount));
    newPlayers[gameState.turnIndex].isUno = false;

    const nextTurn = getNextTurnIndex(gameState.turnIndex, newPlayers.length, gameState.direction);

    await updateDoc(doc(db, 'rooms', roomId), {
      players: newPlayers,
      drawPile: newDrawPile,
      discardPile: newDiscardPile,
      pendingDraw: 0,
      turnIndex: nextTurn,
      logs: [...gameState.logs, `📥 ${user.name} drew ${cardsToDrawCount}`]
    });
  };

  const handleUno = async () => {
    if (!gameState || !roomId || !user) return;
    const idx = gameState.players.findIndex(p => p.id === user.id);
    const newPlayers = [...gameState.players];
    newPlayers[idx].isUno = true;
    await updateDoc(doc(db, 'rooms', roomId), { players: newPlayers, logs: [...gameState.logs, `📣 ${user.name} UNO!`] });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-start overflow-hidden relative">
      <header className="fixed top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
        <h1 className="text-4xl uno-font text-red-600 drop-shadow-lg select-none">UNO</h1>
        <p className="text-emerald-900 font-black tracking-widest uppercase text-[10px] opacity-60">Multiplayer World</p>
      </header>

      {error && (
        <div className="fixed top-8 right-8 bg-white text-rose-600 px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-bounce flex items-center border-2 border-rose-100">
          <span className="font-bold text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}

      <div className="flex-1 w-full flex flex-col items-center justify-center pt-20">
        {!roomId ? (
          <Lobby 
            userName={user.name} 
            currentAvatar={user.avatarUrl}
            onAvatarChange={handleAvatarChange}
            onCreate={handleCreateRoom} 
            onJoin={handleJoinRoom} 
          />
        ) : gameState ? (
          <GameBoard 
            gameState={gameState} 
            userId={user.id} 
            onStart={startGame} 
            onPlayCard={playCard} 
            onDraw={drawCard}
            onUno={handleUno}
            onLeave={() => { setRoomId(null); setGameState(null); }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default App;