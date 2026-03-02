import React, { useState, useEffect, useRef } from 'react';
import { Character } from '../../../types';
import { ArrowLeft, User, Trophy, RefreshCw } from 'lucide-react';

// --- Types ---

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2' | 'black_joker' | 'red_joker';

interface Card {
  id: number;
  suit: Suit;
  rank: Rank;
  value: number; // 3=3, ..., 2=15, Black Joker=16, Red Joker=17
  label: string;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  hand: Card[];
  role: 'landlord' | 'peasant' | null;
  currentBid: number | null; // 0 (pass), 1, 2, 3
  lastAction: string | null;
}

interface DouDizhuGameProps {
  players: Character[]; // Expecting 2 bots
  onExit: () => void;
}

// --- Constants & Helpers ---

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: { rank: Rank; value: number }[] = [
  { rank: '3', value: 3 }, { rank: '4', value: 4 }, { rank: '5', value: 5 },
  { rank: '6', value: 6 }, { rank: '7', value: 7 }, { rank: '8', value: 8 },
  { rank: '9', value: 9 }, { rank: '10', value: 10 }, { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 }, { rank: 'K', value: 13 }, { rank: 'A', value: 14 },
  { rank: '2', value: 15 }
];

const createDeck = (): Card[] => {
  let id = 0;
  const deck: Card[] = [];
  
  SUITS.forEach(suit => {
    RANKS.forEach(({ rank, value }) => {
      deck.push({ 
        id: id++, 
        suit, 
        rank, 
        value, 
        label: rank 
      });
    });
  });

  deck.push({ id: id++, suit: 'joker', rank: 'black_joker', value: 16, label: 'Joker' });
  deck.push({ id: id++, suit: 'joker', rank: 'red_joker', value: 17, label: 'JOKER' });

  return deck;
};

const shuffleDeck = (deck: Card[]) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const sortHand = (hand: Card[]) => {
  return [...hand].sort((a, b) => b.value - a.value);
};

// --- Component ---

const DouDizhuGame: React.FC<DouDizhuGameProps> = ({ players: botCharacters, onExit }) => {
  // Game State
  const [round, setRound] = useState(1);
  const [totalScores, setTotalScores] = useState<Record<string, number>>({});
  const [gameState, setGameState] = useState<'dealing' | 'bidding' | 'playing' | 'roundEnd' | 'gameEnd'>('dealing');
  
  // Round State
  const [deck, setDeck] = useState<Card[]>([]);
  const [landlordCards, setLandlordCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [bidHistory, setBidHistory] = useState<{playerId: string, bid: number}[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  
  // Playing State
  const [lastPlayedCards, setLastPlayedCards] = useState<Card[] | null>(null);
  const [lastPlayerId, setLastPlayerId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);

  // Initialize Players
  useEffect(() => {
    const user: Player = {
      id: 'user',
      name: '我',
      avatar: '', // Will use UI placeholder
      isBot: false,
      hand: [],
      role: null,
      currentBid: null,
      lastAction: null
    };

    const bots: Player[] = botCharacters.slice(0, 2).map(c => ({
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      isBot: true,
      hand: [],
      role: null,
      currentBid: null,
      lastAction: null
    }));

    const initialPlayers = [user, ...bots];
    setPlayers(initialPlayers);
    
    // Initialize scores
    const scores: Record<string, number> = {};
    initialPlayers.forEach(p => scores[p.id] = 0);
    setTotalScores(scores);

    startRound(initialPlayers);
  }, []);

  const startRound = (currentPlayers: Player[]) => {
    setGameState('dealing');
    setLandlordCards([]);
    setBidHistory([]);
    setCurrentBid(0);
    setLandlordId(null);
    setLastPlayedCards(null);
    setLastPlayerId(null);
    setSelectedCardIds([]);

    // Reset player states for new round
    const resetPlayers = currentPlayers.map(p => ({
      ...p,
      hand: [],
      role: null,
      currentBid: null,
      lastAction: null
    }));

    // Shuffle and Deal
    const newDeck = shuffleDeck(createDeck());
    const p1Hand = sortHand(newDeck.slice(0, 17));
    const p2Hand = sortHand(newDeck.slice(17, 34));
    const p3Hand = sortHand(newDeck.slice(34, 51));
    const leftovers = newDeck.slice(51, 54);

    resetPlayers[0].hand = p1Hand;
    resetPlayers[1].hand = p2Hand;
    resetPlayers[2].hand = p3Hand;

    setPlayers(resetPlayers);
    setLandlordCards(leftovers); // Hidden for now

    // Random start for bidding
    const starter = Math.floor(Math.random() * 3);
    setTurnIndex(starter);

    setTimeout(() => {
      setGameState('bidding');
    }, 1000);
  };

  // --- Bidding Logic ---

  useEffect(() => {
    if (gameState === 'bidding') {
      const currentPlayer = players[turnIndex];
      if (currentPlayer.isBot) {
        // Simple Bot Bidding Logic
        const timer = setTimeout(() => {
          handleBotBid(currentPlayer);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, turnIndex, players, currentBid]);

  const handleBotBid = (bot: Player) => {
    // Very simple logic: count high cards (Joker, 2, A)
    const highCards = bot.hand.filter(c => c.value >= 14).length;
    let bid = 0;
    
    if (highCards >= 4) bid = 3;
    else if (highCards >= 2) bid = 2;
    else if (highCards >= 1) bid = 1;
    else bid = 0;

    // Must bid higher than current
    if (bid <= currentBid) bid = 0;

    processBid(bot.id, bid);
  };

  const processBid = (playerId: string, bid: number) => {
    const newBidHistory = [...bidHistory, { playerId, bid }];
    setBidHistory(newBidHistory);

    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, lastAction: bid > 0 ? `${bid}分` : '不叫' } : p
    ));

    if (bid > currentBid) {
      setCurrentBid(bid);
      // If bid is 3, immediate landlord
      if (bid === 3) {
        finalizeLandlord(playerId, 3);
        return;
      }
    }

    // Check if bidding is over (everyone has had a chance)
    // Logic: If 3 people have bid/passed, and someone bid, highest wins.
    // If 3 people passed, redeal.
    
    // Simplified: We just go around once. If currentBid > 0 and it comes back to the highest bidder?
    // Actually standard is: keep going until 2 passes in a row after a bid? 
    // Or just one round of speaking? 
    // Let's do: Everyone speaks once. If someone calls 3, end. 
    // If after 3 turns, max bid > 0, max bidder wins.
    // If max bid 0, redeal.

    const nextTurn = (turnIndex + 1) % 3;
    
    if (newBidHistory.length === 3) {
      // Check results
      const maxBidObj = newBidHistory.reduce((prev, current) => (prev.bid > current.bid) ? prev : current, { bid: 0, playerId: '' });
      
      if (maxBidObj.bid > 0) {
        finalizeLandlord(maxBidObj.playerId, maxBidObj.bid);
      } else {
        // Redeal
        setPlayers(prev => prev.map(p => ({ ...p, lastAction: '重新发牌' })));
        setTimeout(() => startRound(players), 2000);
      }
    } else {
      setTurnIndex(nextTurn);
    }
  };

  const finalizeLandlord = (landlordId: string, finalBid: number) => {
    setLandlordId(landlordId);
    setGameState('playing');
    
    setPlayers(prev => prev.map(p => {
      const isLandlord = p.id === landlordId;
      let newHand = p.hand;
      if (isLandlord) {
        newHand = sortHand([...p.hand, ...landlordCards]);
      }
      return {
        ...p,
        role: isLandlord ? 'landlord' : 'peasant',
        hand: newHand,
        lastAction: null
      };
    }));

    // Landlord starts playing
    const landlordIdx = players.findIndex(p => p.id === landlordId);
    setTurnIndex(landlordIdx);
  };

  // --- Playing Logic (Placeholder for now) ---
  
  useEffect(() => {
    if (gameState === 'playing') {
      const currentPlayer = players[turnIndex];
      if (currentPlayer.isBot) {
        const timer = setTimeout(() => {
          handleBotPlay(currentPlayer);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, turnIndex, players, lastPlayedCards, lastPlayerId]);

  const handleBotPlay = (bot: Player) => {
    // Super simple bot: 
    // If it's my turn to lead (lastPlayerId === bot.id or null), play lowest single.
    // If I have to follow, pass (for now, to keep game moving without complex logic).
    
    let cardsToPlay: Card[] = [];
    let action = '不出';

    const isLeader = lastPlayerId === null || lastPlayerId === bot.id;

    if (isLeader) {
      // Play lowest card
      const card = bot.hand[bot.hand.length - 1];
      cardsToPlay = [card];
      action = '出牌';
    } else {
      // Pass for now (implementing full logic is huge)
      // Try to find a higher single card if single played
      if (lastPlayedCards && lastPlayedCards.length === 1) {
         const targetVal = lastPlayedCards[0].value;
         const higherCard = [...bot.hand].reverse().find(c => c.value > targetVal);
         if (higherCard) {
            cardsToPlay = [higherCard];
            action = '出牌';
         }
      }
    }

    processPlay(bot.id, cardsToPlay, action);
  };

  const processPlay = (playerId: string, cards: Card[], action: string) => {
    if (cards.length > 0) {
      setLastPlayedCards(cards);
      setLastPlayerId(playerId);
      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, hand: p.hand.filter(c => !cards.find(pc => pc.id === c.id)), lastAction: null } : p
      ));
    } else {
      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, lastAction: '不出' } : p
      ));
    }

    // Check Win
    const currentPlayer = players.find(p => p.id === playerId);
    // Note: we need to check the state *after* removing cards. 
    // Since setPlayers is async, we check the length - cards.length
    if (currentPlayer && currentPlayer.hand.length - cards.length === 0) {
      handleRoundEnd(playerId);
    } else {
      setTurnIndex((turnIndex + 1) % 3);
    }
  };

  const handleRoundEnd = (winnerId: string) => {
    setGameState('roundEnd');
    const winner = players.find(p => p.id === winnerId);
    const isLandlordWin = winner?.role === 'landlord';
    
    // Calculate scores (Simplified: Base * Bid)
    // Real rules are complex. Here: Landlord gets 2x Bid, Peasants lose 1x Bid (or vice versa)
    const baseScore = currentBid * 100; // Arbitrary points
    
    const newScores = { ...totalScores };
    players.forEach(p => {
      if (isLandlordWin) {
        if (p.role === 'landlord') newScores[p.id] += baseScore * 2;
        else newScores[p.id] -= baseScore;
      } else {
        if (p.role === 'landlord') newScores[p.id] -= baseScore * 2;
        else newScores[p.id] += baseScore;
      }
    });
    
    setTotalScores(newScores);
  };

  const nextRound = () => {
    if (round >= 10) {
      setGameState('gameEnd');
    } else {
      setRound(r => r + 1);
      startRound(players);
    }
  };

  // --- UI Helpers ---

  const getCardColor = (card: Card) => {
    if (card.suit === 'hearts' || card.suit === 'diamonds' || card.rank === 'red_joker') return 'text-red-600';
    return 'text-black';
  };

  const getSuitIcon = (suit: Suit) => {
    switch(suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      case 'joker': return '';
      default: return '';
    }
  };

  const renderCard = (card: Card, isSelected: boolean = false, onClick?: () => void, small: boolean = false) => (
    <div 
      key={card.id}
      onClick={onClick}
      className={`
        relative bg-white rounded-lg shadow-md border border-gray-200 
        flex flex-col items-center justify-between select-none
        ${small ? 'w-8 h-12 text-xs' : 'w-20 h-28 text-xl'}
        ${isSelected ? '-translate-y-4 border-blue-400 ring-2 ring-blue-200' : ''}
        ${getCardColor(card)}
        transition-transform cursor-pointer
      `}
    >
      <div className="self-start pl-1 font-bold">{card.label}</div>
      <div className="text-2xl">{getSuitIcon(card.suit)}</div>
      <div className="self-end pr-1 rotate-180 font-bold">{card.label}</div>
    </div>
  );

  const renderHiddenCard = (small: boolean = false) => (
    <div className={`
      bg-blue-600 rounded-lg shadow-md border-2 border-white 
      ${small ? 'w-8 h-12' : 'w-20 h-28'}
      flex items-center justify-center
    `}>
      <div className="w-full h-full opacity-20 bg-pattern-dots"></div>
    </div>
  );

  // --- User Interaction ---

  const handleUserBid = (bid: number) => {
    processBid('user', bid);
  };

  const handleUserPlay = () => {
    if (selectedCardIds.length === 0) return;
    const cards = players[0].hand.filter(c => selectedCardIds.includes(c.id));
    
    // Validate move (Simplified: always allow for now, or just check single/pair)
    // In real game, need complex validation.
    
    processPlay('user', cards, '出牌');
    setSelectedCardIds([]);
  };

  const handleUserPass = () => {
    processPlay('user', [], '不出');
    setSelectedCardIds([]);
  };

  const toggleCardSelection = (id: number) => {
    if (gameState !== 'playing' || turnIndex !== 0) return;
    setSelectedCardIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  // --- RENDER ---

  if (players.length === 0) {
    return <div className="w-full h-full bg-green-800 flex items-center justify-center text-white">Loading...</div>;
  }

  const user = players[0];
  const rightBot = players[1];
  const leftBot = players[2];

  if (gameState === 'gameEnd') {
    const sortedPlayers = [...players].sort((a, b) => totalScores[b.id] - totalScores[a.id]);
    return (
      <div className="fixed inset-0 bg-black z-50 overflow-hidden">
        <div 
          className="origin-top-left bg-green-800 flex flex-col items-center justify-center text-white p-8 absolute top-0 left-full overflow-y-auto"
          style={{ width: '100vh', height: '100vw', transform: 'rotate(90deg)' }}
        >
          <Trophy size={64} className="text-yellow-400 mb-4" />
          <h1 className="text-3xl font-bold mb-8">游戏结束</h1>
          <div className="w-full max-w-md bg-white/10 rounded-2xl p-6 space-y-4">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-bold ${idx === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>#{idx + 1}</span>
                  <img src={p.avatar || 'https://api.dicebear.com/9.x/micah/svg?seed=User'} className="w-10 h-10 rounded-full bg-white" />
                  <span className="font-bold">{p.name}</span>
                </div>
                <span className="text-xl font-mono">{totalScores[p.id]}</span>
              </div>
            ))}
          </div>
          <button onClick={onExit} className="mt-8 px-8 py-3 bg-yellow-500 text-black font-bold rounded-full">
            退出游戏
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      <div 
        className="origin-top-left bg-[#2d5a27] relative flex flex-col absolute top-0 left-full"
        style={{ width: '100vh', height: '100vw', transform: 'rotate(90deg)' }}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/20 text-white z-10 h-16">
          <div className="flex items-center gap-2">
            <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft /></button>
            <span>第 {round}/10 局</span>
          </div>
          <div className="flex gap-2">
            {landlordCards.map((c, i) => (
              <div key={i} className="transform scale-75 origin-top">
                {gameState === 'dealing' || gameState === 'bidding' ? renderHiddenCard() : renderCard(c)}
              </div>
            ))}
          </div>
          <div className="font-mono bg-black/40 px-3 py-1 rounded-full">底分: {currentBid * 100}</div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative w-full h-full">
          
          {/* Left Bot */}
          {leftBot && (
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
              <div className={`relative ${turnIndex === 2 ? 'ring-4 ring-yellow-400 rounded-full' : ''}`}>
                <img src={leftBot.avatar} className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white" />
                {leftBot.role === 'landlord' && <div className="absolute -top-2 -right-2 text-2xl">👑</div>}
                <div className="absolute -bottom-1 bg-black/50 text-white text-sm px-2 rounded-full">{leftBot.hand.length}</div>
              </div>
              <div className="text-white text-sm shadow-black drop-shadow-md font-bold">{leftBot.name}</div>
              <div className="text-yellow-300 text-sm font-mono">{totalScores[leftBot.id]}</div>
              {leftBot.lastAction && (
                <div className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-bold animate-bounce absolute left-full ml-2 top-0 whitespace-nowrap">
                  {leftBot.lastAction}
                </div>
              )}
            </div>
          )}

          {/* Right Bot */}
          {rightBot && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
              <div className={`relative ${turnIndex === 1 ? 'ring-4 ring-yellow-400 rounded-full' : ''}`}>
                <img src={rightBot.avatar} className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white" />
                {rightBot.role === 'landlord' && <div className="absolute -top-2 -right-2 text-2xl">👑</div>}
                <div className="absolute -bottom-1 bg-black/50 text-white text-sm px-2 rounded-full">{rightBot.hand.length}</div>
              </div>
              <div className="text-white text-sm shadow-black drop-shadow-md font-bold">{rightBot.name}</div>
              <div className="text-yellow-300 text-sm font-mono">{totalScores[rightBot.id]}</div>
              {rightBot.lastAction && (
                <div className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-bold animate-bounce absolute right-full mr-2 top-0 whitespace-nowrap">
                  {rightBot.lastAction}
                </div>
              )}
            </div>
          )}

          {/* Center Table (Played Cards) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-40 flex items-center justify-center pointer-events-none">
            {lastPlayedCards && (
              <div className="flex -space-x-8 transform scale-110">
                {lastPlayedCards.map(c => renderCard(c))}
              </div>
            )}
            {gameState === 'roundEnd' && (
               <div className="absolute inset-0 flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in pointer-events-auto">
                  <div className="bg-black/70 p-8 rounded-2xl backdrop-blur-md flex flex-col items-center border border-white/10 shadow-2xl">
                    <div className="text-5xl font-bold text-yellow-400 mb-6 drop-shadow-lg">
                      {players.find(p => p.hand.length === 0)?.id === 'user' ? '🎉 你赢了!' : '💔 你输了'}
                    </div>
                    <button 
                      onClick={nextRound}
                      className="px-8 py-3 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 flex items-center gap-2 text-lg shadow-lg transition-transform hover:scale-105"
                    >
                      <RefreshCw size={24} /> 下一局
                    </button>
                  </div>
               </div>
            )}
          </div>

          {/* User Hand */}
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-4">
            
            {/* Controls */}
            <div className="h-14 flex items-center gap-6 mb-2">
              {gameState === 'bidding' && turnIndex === 0 && (
                <>
                  <button onClick={() => handleUserBid(0)} className="px-8 py-3 bg-gray-500 text-white rounded-full font-bold shadow-lg hover:bg-gray-600 transition-colors">不叫</button>
                  {currentBid < 1 && <button onClick={() => handleUserBid(1)} className="px-8 py-3 bg-blue-500 text-white rounded-full font-bold shadow-lg hover:bg-blue-600 transition-colors">1分</button>}
                  {currentBid < 2 && <button onClick={() => handleUserBid(2)} className="px-8 py-3 bg-blue-500 text-white rounded-full font-bold shadow-lg hover:bg-blue-600 transition-colors">2分</button>}
                  {currentBid < 3 && <button onClick={() => handleUserBid(3)} className="px-8 py-3 bg-orange-500 text-white rounded-full font-bold shadow-lg hover:bg-orange-600 transition-colors">3分</button>}
                </>
              )}
              
              {gameState === 'playing' && turnIndex === 0 && (
                <>
                  {lastPlayerId !== 'user' && lastPlayerId !== null && (
                    <button onClick={handleUserPass} className="px-8 py-3 bg-gray-500 text-white rounded-full font-bold shadow-lg hover:bg-gray-600 transition-colors">不出</button>
                  )}
                  <button 
                    onClick={handleUserPlay} 
                    disabled={selectedCardIds.length === 0}
                    className={`px-10 py-3 rounded-full font-bold shadow-lg transition-all ${selectedCardIds.length > 0 ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-105' : 'bg-gray-300 text-gray-500'}`}
                  >
                    出牌
                  </button>
                </>
              )}
              
              {user.lastAction && gameState !== 'roundEnd' && (
                 <div className="bg-white/90 text-black px-6 py-2 rounded-full text-lg font-bold shadow-lg">
                    {user.lastAction}
                 </div>
              )}
            </div>

            {/* Cards */}
            <div className="w-full px-8 overflow-x-auto">
              <div className="flex -space-x-10 hover:-space-x-9 transition-all duration-300 mx-auto w-fit min-w-max py-6 px-4">
                {user.hand.map(card => renderCard(card, selectedCardIds.includes(card.id), () => toggleCardSelection(card.id)))}
              </div>
            </div>
            
            {/* User Info */}
            <div className="absolute bottom-4 left-8 flex items-center gap-4 text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">我</span>
                {user.role === 'landlord' && <span className="text-xl">👑</span>}
              </div>
              <div className="w-px h-5 bg-white/30"></div>
              <div className="font-mono text-yellow-300 text-lg">{totalScores['user']}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DouDizhuGame;
