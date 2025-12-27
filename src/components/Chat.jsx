import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCharacter } from '../data/characters';
import { sendMessage } from '../services/anthropic';

export default function Chat() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const character = getCharacter(characterId);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const maxQuestions = parseInt(sessionStorage.getItem('max_questions') || '3', 10);

  useEffect(() => {
    if (!character) {
      navigate('/');
      return;
    }

    // Load chat history
    const savedHistory = sessionStorage.getItem(`chat_history_${characterId}`);
    if (savedHistory) {
      setMessages(JSON.parse(savedHistory));
    }
  }, [characterId, character, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Save history when messages change
    if (messages.length > 0) {
      sessionStorage.setItem(`chat_history_${characterId}`, JSON.stringify(messages));
    }
  }, [messages, characterId]);

  const questionCount = messages.filter(m => m.role === 'user').length;
  const hasReachedLimit = questionCount >= maxQuestions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || hasReachedLimit) return;

    const apiKey = sessionStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setError('Accesso non autorizzato. Torna alla home e inserisci la password del terminale.');
      return;
    }

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await sendMessage(apiKey, character.systemPrompt, newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (err) {
      setError(err.message);
      // Remove the user message if API call failed
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  if (!character) return null;

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto text-white">
      {/* Header */}
      <header
        className="flex flex-col md:flex-row items-center justify-between p-4 bg-black/30 gap-3"
        style={{ borderBottom: `2px solid ${character.color}` }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-full md:w-auto px-4 py-2 bg-transparent border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
        >
          ← Torna ai sospettati
        </button>

        <div className="flex items-center gap-3">
          <span className="text-3xl">{character.avatar}</span>
          <div className="text-center md:text-left">
            <h2 className="text-lg font-bold">{character.name}</h2>
            <p className="text-sm" style={{ color: character.color }}>{character.title}</p>
          </div>
        </div>

        <div
          className="px-4 py-2 rounded-full font-semibold text-sm text-white"
          style={{ backgroundColor: character.color }}
        >
          Domande: {questionCount}/{maxQuestions}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <p className="mb-2">Inizia l'interrogatorio con {character.name}.</p>
            <p className="text-sm italic">Scegli bene le tue domande!</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 max-w-[85%] ${
              message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <span className="text-2xl flex-shrink-0">
              {message.role === 'assistant' ? character.avatar : '🕵️'}
            </span>
            <div
              className={`px-4 py-3 rounded-2xl leading-relaxed ${
                message.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-white/10 rounded-bl-sm'
              }`}
              style={message.role === 'user' ? { backgroundColor: character.color } : {}}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 max-w-[85%]">
            <span className="text-2xl flex-shrink-0">{character.avatar}</span>
            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg text-center border border-red-500/30">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form or Limit Reached Message */}
      {hasReachedLimit ? (
        <div className="p-4 bg-black/20 text-center">
          <p className="text-gray-400">
            Hai esaurito le {maxQuestions} domande per questo personaggio.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-3 px-6 py-2 rounded-full text-white font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: character.color }}
          >
            Interroga un altro sospettato
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 bg-black/20 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fai una domanda..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-black/30 border-2 border-white/10 rounded-full text-white focus:outline-none transition-colors placeholder-gray-500"
            style={{ '--tw-ring-color': character.color }}
            onFocus={(e) => e.target.style.borderColor = character.color}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 rounded-full text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
            style={{ backgroundColor: character.color }}
          >
            Invia
          </button>
        </form>
      )}
    </div>
  );
}
