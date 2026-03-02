import React, { useState } from 'react';
import { ArrowLeft, Users, Gamepad2, Search, Grid, Beer, Check, X } from 'lucide-react';
import { AppRoute, Character } from '../../types';
import DouDizhuGame from './Games/DouDizhuGame';

interface GameAppProps {
  onNavigate: (route: AppRoute) => void;
  characters: Character[];
}

interface GameDefinition {
  id: string;
  name: string;
  description: string;
  minPlayers: number; // Number of bots to select
  maxPlayers: number; // Number of bots to select
  icon: React.ReactNode;
  color: string;
}

const GAMES: GameDefinition[] = [
  {
    id: 'dou-dizhu',
    name: '斗地主',
    description: '经典三人斗地主，需邀请2位好友。',
    minPlayers: 2,
    maxPlayers: 2,
    icon: <Gamepad2 size={32} />,
    color: 'bg-blue-500'
  },
  {
    id: 'dou-dizhu-4',
    name: '四人斗地主',
    description: '两副牌四人对战，需邀请3位好友。',
    minPlayers: 3,
    maxPlayers: 3,
    icon: <Users size={32} />,
    color: 'bg-indigo-500'
  },
  {
    id: 'liars-bar',
    name: '骗子酒馆',
    description: '心理博弈，谁在说谎？需邀请3位好友。',
    minPlayers: 3,
    maxPlayers: 3,
    icon: <Beer size={32} />,
    color: 'bg-amber-600'
  },
  {
    id: 'mahjong',
    name: '麻将',
    description: '国粹竞技，需邀请3位好友。',
    minPlayers: 3,
    maxPlayers: 3,
    icon: <Grid size={32} />,
    color: 'bg-emerald-600'
  },
  {
    id: 'who-is-spy',
    name: '谁是卧底',
    description: '语言推理游戏，需邀请5-9位好友。',
    minPlayers: 5,
    maxPlayers: 9,
    icon: <Search size={32} />,
    color: 'bg-rose-600'
  }
];

const GameApp: React.FC<GameAppProps> = ({ onNavigate, characters }) => {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [activeGameSession, setActiveGameSession] = useState<{
    game: GameDefinition;
    players: Character[];
  } | null>(null);

  const handleGameSelect = (game: GameDefinition) => {
    setSelectedGame(game);
    setSelectedCharacterIds([]);
  };

  const toggleCharacter = (charId: string) => {
    setSelectedCharacterIds(prev => {
      if (prev.includes(charId)) {
        return prev.filter(id => id !== charId);
      } else {
        // Check max limit
        if (selectedGame && prev.length >= selectedGame.maxPlayers) {
          return prev; // Prevent adding more than max
        }
        return [...prev, charId];
      }
    });
  };

  const handleStartGame = () => {
    if (!selectedGame) return;
    const players = characters.filter(c => selectedCharacterIds.includes(c.id));
    setActiveGameSession({
      game: selectedGame,
      players: players
    });
    setSelectedGame(null);
  };

  const handleQuitGame = () => {
    setActiveGameSession(null);
  };

  // --- RENDER: Active Game ---
  if (activeGameSession) {
    if (activeGameSession.game.id === 'dou-dizhu') {
      return (
        <DouDizhuGame 
          players={activeGameSession.players} 
          onExit={handleQuitGame} 
        />
      );
    }

    return (
      <div className="w-full h-full bg-gray-900 text-white flex flex-col font-sans">
        <div className="flex items-center p-4 bg-gray-800 shadow-md">
          <button 
            onClick={handleQuitGame}
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="ml-2 text-xl font-bold">{activeGameSession.game.name}</h1>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className={`p-6 rounded-full ${activeGameSession.game.color} bg-opacity-20`}>
            {React.cloneElement(activeGameSession.game.icon as React.ReactElement, { size: 64 })}
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">游戏进行中...</h2>
            <p className="text-gray-400">正在与以下好友对战</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-xs">
            {/* User */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-green-500">
                <span className="text-xs font-bold">我</span>
              </div>
              <span className="text-xs text-gray-400">你</span>
            </div>

            {/* Bots */}
            {activeGameSession.players.map(player => (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <img 
                  src={player.avatar} 
                  alt={player.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                />
                <span className="text-xs text-gray-400 max-w-[60px] truncate">{player.name}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleQuitGame}
            className="mt-8 px-8 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors font-medium"
          >
            结束游戏
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: Game List ---
  return (
    <div className="w-full h-full bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center p-4 bg-white shadow-sm z-10">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="ml-2 text-xl font-bold text-gray-800">游戏中心</h1>
      </div>

      {/* Game Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => handleGameSelect(game)}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-98 transition-transform text-left"
          >
            <div className={`w-14 h-14 rounded-xl ${game.color} flex items-center justify-center text-white shadow-md`}>
              {game.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{game.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{game.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Character Selection Modal */}
      {selectedGame && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg">邀请好友</h3>
                <p className="text-xs text-gray-500">
                  {selectedGame.name} 需要 {selectedGame.minPlayers === selectedGame.maxPlayers ? selectedGame.minPlayers : `${selectedGame.minPlayers}-${selectedGame.maxPlayers}`} 位好友
                </p>
              </div>
              <button 
                onClick={() => setSelectedGame(null)}
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Character List */}
            <div className="flex-1 overflow-y-auto p-2">
              {characters.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p>暂无好友，快去创建角色吧！</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {characters.map(char => {
                    const isSelected = selectedCharacterIds.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        onClick={() => toggleCharacter(char.id)}
                        className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <img src={char.avatar} alt={char.name} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{char.name}</div>
                          <div className="text-xs text-gray-400 truncate">{char.description}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleStartGame}
                disabled={selectedCharacterIds.length < selectedGame.minPlayers || selectedCharacterIds.length > selectedGame.maxPlayers}
                className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${
                  selectedCharacterIds.length >= selectedGame.minPlayers && selectedCharacterIds.length <= selectedGame.maxPlayers
                    ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                开始游戏 ({selectedCharacterIds.length}/{selectedGame.maxPlayers})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameApp;
