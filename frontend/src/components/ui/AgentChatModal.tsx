import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import { sendAgentMessage } from '@/services/api';
import type { LifterProfile } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  agentType?: string;
  timestamp: string;
}

interface AgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LifterProfile;
  currentProgramId?: string;
}

export function AgentChatModal({
  isOpen,
  onClose,
  profile,
  currentProgramId,
}: AgentChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendAgentMessage({
        message: input,
        profile,
        currentProgramId,
      });

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: response.response.message || response.response.response || 'No response',
        agentType: response.agentUsed,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'agent',
        content: 'Sorry, I encountered an error. Please try again.',
        agentType: 'system',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Coach AI
              </CardTitle>
              <p className="text-sm text-zinc-400 mt-1">
                Ask me anything about training, technique, or programming
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <MessageCircle className="w-12 h-12 text-zinc-600" />
              <div className="space-y-2">
                <p className="text-zinc-400">Ask me anything!</p>
                <div className="text-sm text-zinc-500 space-y-1">
                  <p>Try asking:</p>
                  <ul className="list-none space-y-1">
                    <li>"How do I improve my bench lockout?"</li>
                    <li>"My lower back hurts after squats"</li>
                    <li>"What's the best accessory for weak quads?"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-lime-400 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                {msg.role === 'agent' && msg.agentType && (
                  <div className="text-xs font-medium text-zinc-400 mb-1 uppercase">
                    {msg.agentType.replace('_', ' ')}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
