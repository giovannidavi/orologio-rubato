import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { characters } from '../data/characters';
import { clearTeamHistory, subscribeToTeamChats } from '../firebase/database';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [questionCounts, setQuestionCounts] = useState({});
  const [maxQuestions, setMaxQuestions] = useState(3);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
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
  }, [searchParams]);

  // Handle erase param when API key is available
  useEffect(() => {
    const handleErase = async () => {
      if (searchParams.get('erase') === 'true' && apiKey) {
        setIsErasing(true);
        try {
          await clearTeamHistory(apiKey);
          // Remove the query param after erasing
          setSearchParams({});
        } catch (err) {
          console.error('Error clearing history:', err);
        } finally {
          setIsErasing(false);
        }
      }
    };

    handleErase();
  }, [searchParams, setSearchParams, apiKey]);

  // Subscribe to question counts when API key changes
  useEffect(() => {
    if (!apiKey) {
      setQuestionCounts({});
      return;
    }

    const characterIds = characters.map(c => c.id);
    const unsubscribe = subscribeToTeamChats(apiKey, characterIds, (counts) => {
      setQuestionCounts(counts);
    });

    return () => unsubscribe();
  }, [apiKey]);

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
    <div className="min-h-screen text-text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-accent-gold tracking-wider mb-2"
              style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}>
            L'OROLOGIO RUBATO
          </h1>
          <p className="font-mono text-lg md:text-xl text-text-secondary italic">
            Interroga i sospettati. Scopri la verità.
          </p>
        </header>

        {/* Terminal Access Section */}
        <div className="terminal-card mb-8">
          <div className="terminal-header">
            <div className="terminal-dot bg-error"></div>
            <div className="terminal-dot bg-warning"></div>
            <div className="terminal-dot bg-success"></div>
            <span className="text-text-secondary text-sm ml-2">terminale_accesso.sh</span>
          </div>
          <div className="terminal-body">
            <label htmlFor="apiKey" className="block mb-2 font-display text-sm uppercase tracking-wider text-accent-gold">
              Password di accesso al Terminale Interrogatori:
            </label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Inserisci la password..."
                className="input-field flex-1"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="btn-secondary px-4"
              >
                {showApiKey ? 'NASCONDI' : 'MOSTRA'}
              </button>
            </div>
            {apiKey && (
              <p className="mt-3 text-sm text-success font-mono">
                {'>'} Accesso al terminale autorizzato
              </p>
            )}
            {isErasing && (
              <p className="mt-3 text-sm text-warning font-mono">
                {'>'} Cancellazione cronologia in corso...
              </p>
            )}
          </div>
        </div>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {characters.map(character => (
            <div
              key={character.id}
              onClick={() => handleCharacterClick(character.id)}
              className={`terminal-card transition-all duration-300 ${
                isUnlocked
                  ? 'cursor-pointer hover:-translate-y-1 hover:shadow-glow-gold'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Terminal Header */}
              <div className="terminal-header">
                <div className="terminal-dot" style={{ backgroundColor: character.color }}></div>
                <span className="text-text-secondary text-xs ml-1 truncate">sospettato_{character.id}.log</span>
                {/* Question badge */}
                {questionCounts[character.id] > 0 && (
                  <span
                    className="ml-auto px-2 py-0.5 rounded text-xs font-mono text-bg-primary"
                    style={{ backgroundColor: character.color }}
                  >
                    {questionCounts[character.id]}Q
                  </span>
                )}
              </div>

              <div className="terminal-body">
                {/* Avatar */}
                <div className="text-5xl mb-3">{character.avatar}</div>

                {/* Name & Title */}
                <h3 className="font-display text-lg font-bold text-text-primary mb-1 uppercase tracking-wide">
                  {character.name}
                </h3>
                <p className="font-mono text-sm mb-3" style={{ color: character.color }}>
                  {character.title}
                </p>

                {/* Description */}
                <p className="text-text-secondary text-sm leading-relaxed mb-4 font-mono">
                  {character.shortDescription}
                </p>

                {/* Suspicion Bar */}
                <div className="mt-auto">
                  <div className="flex justify-between text-xs text-text-secondary mb-1 font-mono">
                    <span>SOSPETTO</span>
                    <span>{character.suspicionLevel}%</span>
                  </div>
                  <div className="h-1 bg-bg-secondary rounded overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${character.suspicionLevel}%`,
                        backgroundColor: character.color,
                        boxShadow: `0 0 10px ${character.color}`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center pt-4 border-t border-border-custom">
          <p className="text-text-secondary font-mono text-sm">
            {'>'} Ogni squadra ha {maxQuestions} domande per personaggio. Scegliete con saggezza.
          </p>
        </footer>
      </div>
    </div>
  );
}
