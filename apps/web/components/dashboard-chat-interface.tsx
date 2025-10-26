'use client';

import { useState, useCallback, useRef } from 'react';
import { Logo } from './logo';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ResponseStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string };

export function DashboardChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<ResponseStatus>({ state: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: 'Suggest meal from pantry', prompt: 'What can I make with the ingredients in my pantry?' },
    { label: 'Plan this week', prompt: 'Help me plan meals for this week based on my goals and pantry' },
    { label: 'Optimize my grocery list', prompt: 'Review my grocery list and suggest optimizations' },
    { label: 'Meal prep ideas', prompt: 'Give me meal prep ideas that fit my dietary preferences' },
  ];

  const handleQuickAction = useCallback((prompt: string) => {
    handleSend(prompt);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setStatus({ state: 'loading' });

    try {
      const response = await fetch('/api/assistant/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          state: 'error',
          message: data.error?.message || data.message || 'Unable to process your request',
        });
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.result || 'I received your message!',
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus({ state: 'idle' });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Network error occurred',
      });
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim() && status.state !== 'loading') {
        handleSend(inputValue);
      }
    },
    [inputValue, status, handleSend]
  );

  const isLoading = status.state === 'loading';

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
      {/* Personalized mode banner */}
      <div className="bg-gradient-to-r from-brand-primary/10 via-brand-primary/20 to-brand-primary/10 border-b border-brand-primary/30 p-3 text-center">
        <p className="text-sm text-gray-800 font-medium">
          <svg className="inline h-4 w-4 mr-1 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Personalized AI using your pantry, preferences, and goals
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl text-gray-600 mb-4">Your Personal Chef</p>
              <div className="flex justify-center items-center mb-4">
                <Logo size="xl" />
              </div>
              <p className="text-gray-600 mb-6">
                I know your pantry, preferences, and goals. Ask me anything about meal planning!
              </p>

              <div className="mb-6">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="What would you like to cook today?"
                      disabled={isLoading}
                      className="flex-1 border-2 border-brand-primary/30 focus:border-brand-primary rounded-lg shadow-lg h-12 text-base px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !inputValue.trim()}
                      className="h-12 px-6 shadow-lg bg-gradient-to-r from-brand-primary to-brand-dark text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isLoading ? (
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="h-auto py-3 px-4 text-left border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-secondary/10 transition text-sm font-medium text-gray-700 hover:text-brand-primary"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {status.state === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Error: {status.message}</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}

              <div
                className={`p-4 rounded-lg max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
              </div>

              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
                <svg className="h-4 w-4 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area when messages exist */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-brand-primary/5 via-brand-primary/10 to-brand-primary/5">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about recipes, meal planning, or your pantry..."
                disabled={isLoading}
                className="flex-1 border-2 border-brand-primary/30 focus:border-brand-primary rounded-lg shadow-md h-12 text-base px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-12 px-6 shadow-md bg-gradient-to-r from-brand-primary to-brand-dark text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
