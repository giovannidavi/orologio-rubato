import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCharacter } from '../data/characters';
import { sendMessage } from '../services/anthropic';
import { saveChatHistory, subscribeToChatHistory } from '../firebase/database';

export default function Chat() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const character = getCharacter(characterId);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const maxQuestions = parseInt(sessionStorage.getItem('max_questions') || '3', 10);
  const apiKey = sessionStorage.getItem('anthropic_api_key');

  useEffect(() => {
    if (!character) {
      navigate('/');
      return;
    }

    if (!apiKey) {
      navigate('/');
      return;
    }

    // Subscribe to chat history from Firebase (real-time updates)
    setIsLoadingHistory(true);
    const unsubscribe = subscribeToChatHistory(
      apiKey,
      characterId,
      (history) => {
        setMessages(history);
        setIsLoadingHistory(false);
      },
      (error) => {
        console.error('Firebase error:', error);
        setError('Errore di connessione al database. Controlla le regole Firebase.');
        setIsLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [characterId, character, navigate, apiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const questionCount = messages.filter(m => m.role === 'user').length;
  const hasReachedLimit = questionCount >= maxQuestions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || hasReachedLimit) return;

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
      const updatedMessages = [...newMessages, { role: 'assistant', content: response }];
      setMessages(updatedMessages);

      // Save to Firebase
      await saveChatHistory(apiKey, characterId, updatedMessages);
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
    <div className="flex flex-col h-screen max-w-3xl mx-auto text-text-primary">
      {/* Header */}
      <header className="terminal-card rounded-none">
        <div className="terminal-header">
          <div className="terminal-dot" style={{ backgroundColor: character.color }}></div>
          <span className="text-text-secondary text-sm ml-1">interrogatorio_{character.id}.log</span>
          <span
            className="ml-auto px-3 py-1 rounded text-xs font-display uppercase text-bg-primary"
            style={{ backgroundColor: character.color }}
          >
            {questionCount}/{maxQuestions}
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary w-full md:w-auto text-sm"
          >
            ← SOSPETTATI
          </button>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{character.avatar}</span>
            <div className="text-center md:text-left">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">{character.name}</h2>
              <p className="font-mono text-sm" style={{ color: character.color }}>{character.title}</p>
            </div>
          </div>

          <div className="w-full md:w-auto md:opacity-0 md:pointer-events-none">
            <button className="btn-secondary w-full md:w-auto text-sm opacity-0">← SOSPETTATI</button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-bg-primary">
        {isLoadingHistory ? (
          <div className="text-center text-text-secondary py-12 font-mono">
            <p>{'>'} Caricamento cronologia...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-text-secondary py-12 font-mono">
            <p className="mb-2">{'>'} Inizia l'interrogatorio con {character.name}.</p>
            <p className="text-sm">{'>'} Scegli bene le tue domande!</p>
          </div>
        ) : null}

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
              className={`px-4 py-3 font-mono text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'text-bg-primary rounded rounded-br-none'
                  : 'bg-bg-card border border-border-custom rounded rounded-bl-none'
              }`}
              style={message.role === 'user' ? {
                backgroundColor: character.color,
                boxShadow: `0 0 15px ${character.color}40`
              } : {}}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 max-w-[85%]">
            <span className="text-2xl flex-shrink-0">{character.avatar}</span>
            <div className="bg-bg-card border border-border-custom px-4 py-3 rounded rounded-bl-none flex gap-1">
              <span className="typing-dot w-2 h-2 bg-accent-cyan rounded-full"></span>
              <span className="typing-dot w-2 h-2 bg-accent-cyan rounded-full"></span>
              <span className="typing-dot w-2 h-2 bg-accent-cyan rounded-full"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-error/20 text-error px-4 py-3 rounded text-center border border-error/30 font-mono text-sm">
            {'>'} {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form or Limit Reached Message */}
      {hasReachedLimit ? (
        <div className="p-4 bg-bg-secondary border-t border-border-custom text-center">
          <p className="text-text-secondary font-mono text-sm mb-3">
            {'>'} Hai esaurito le {maxQuestions} domande per questo personaggio.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            INTERROGA UN ALTRO SOSPETTATO
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 bg-bg-secondary border-t border-border-custom flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="> Fai una domanda..."
            disabled={isLoading || isLoadingHistory}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={isLoading || isLoadingHistory || !input.trim()}
            className="btn-primary"
          >
            INVIA
          </button>
        </form>
      )}
    </div>
  );
}
