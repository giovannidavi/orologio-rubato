import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { characters } from '../data/characters';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [questionCounts, setQuestionCounts] = useState({});
  const [maxQuestions, setMaxQuestions] = useState(3);

  useEffect(() => {
    // Check for erase query param (admin only)
    if (searchParams.get('erase') === 'true') {
      characters.forEach(char => {
        sessionStorage.removeItem(`chat_history_${char.id}`);
      });
      // Remove the query param after erasing
      setSearchParams({});
    }

    // Check for question limit param
    const qParam = searchParams.get('q');
    if (qParam) {
      const qValue = parseInt(qParam, 10);
      if (!isNaN(qValue) && qValue > 0) {
        sessionStorage.setItem('max_questions', qValue.toString());
        setMaxQuestions(qValue);
      }
    } else {
      // Load from sessionStorage if no param
      const savedMax = sessionStorage.getItem('max_questions');
      if (savedMax) {
        setMaxQuestions(parseInt(savedMax, 10));
      }
    }

    const savedKey = sessionStorage.getItem('anthropic_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }

    // Load question counts
    const counts = {};
    characters.forEach(char => {
      const history = sessionStorage.getItem(`chat_history_${char.id}`);
      if (history) {
        const messages = JSON.parse(history);
        counts[char.id] = messages.filter(m => m.role === 'user').length;
      } else {
        counts[char.id] = 0;
      }
    });
    setQuestionCounts(counts);
  }, [searchParams, setSearchParams]);

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    sessionStorage.setItem('anthropic_api_key', key);
  };

  const isUnlocked = apiKey.trim().length > 0;

  const handleCharacterClick = (characterId) => {
    if (!isUnlocked) return;
    navigate(`/chat/${characterId}`);
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gold tracking-wider mb-2"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            L'OROLOGIO RUBATO
          </h1>
          <p className="text-lg md:text-xl text-gray-400 italic">
            Interroga i sospettati. Scopri la verità.
          </p>
        </header>

        {/* Terminal Access Section */}
        <div className="bg-white/5 rounded-xl p-4 md:p-6 mb-8 border border-white/10">
          <label htmlFor="apiKey" className="block mb-2 font-semibold text-gold">
            🔐 Password di accesso al Terminale Interrogatori:
          </label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              id="apiKey"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Inserisci la password..."
              className="flex-1 px-4 py-3 bg-black/30 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-gold transition-colors"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-4 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-xl"
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          {apiKey && (
            <p className="mt-2 text-sm text-green-400">✓ Accesso al terminale autorizzato</p>
          )}
        </div>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {characters.map(character => (
            <div
              key={character.id}
              onClick={() => handleCharacterClick(character.id)}
              className={`relative bg-white/5 rounded-2xl p-5 transition-all duration-300 border-2 border-transparent overflow-hidden group ${
                isUnlocked
                  ? 'cursor-pointer hover:border-current hover:-translate-y-1 hover:shadow-xl'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                '--tw-border-opacity': 1,
                borderColor: 'transparent',
              }}
              onMouseEnter={(e) => isUnlocked && (e.currentTarget.style.borderColor = character.color)}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: character.color }}
              />

              {/* Question badge */}
              {questionCounts[character.id] > 0 && (
                <div
                  className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: character.color }}
                >
                  {questionCounts[character.id]} domande
                </div>
              )}

              {/* Avatar */}
              <div className="text-5xl mb-3">{character.avatar}</div>

              {/* Name & Title */}
              <h3 className="text-xl font-bold text-white mb-1">{character.name}</h3>
              <p className="font-semibold mb-3" style={{ color: character.color }}>
                {character.title}
              </p>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {character.shortDescription}
              </p>

              {/* Suspicion Bar */}
              <div className="mt-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Livello di sospetto</span>
                  <span>{character.suspicionLevel}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${character.suspicionLevel}%`,
                      backgroundColor: character.color
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center pt-4 border-t border-white/10">
          <p className="text-gray-500 italic">
            Ogni squadra ha {maxQuestions} domande per personaggio. Scegliete con saggezza.
          </p>
        </footer>
      </div>
    </div>
  );
}
