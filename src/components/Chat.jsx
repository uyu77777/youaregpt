import React, { useEffect, useRef, useState } from 'react';
import { generateAIResponse } from '../lib/gemini';
import { ArrowUp, Menu, Plus, User, Bot, Loader2 } from 'lucide-react';
import './Chat.css';

const TERMINATION_MESSAGES = {
  normal: 'このへんで大丈夫です。ありがとうございました。',
  harsh: 'もういいです。これ以上は頼みません。',
  randomLevel5: 'なんかもう違う気がします。ここで終わりにします。',
};

const buildGenerationErrorMessage = (error) => {
  const message = error?.message ?? '';

  if (
    message.includes('利用上限') ||
    message.includes('quota') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('429')
  ) {
    return 'アクセスが集中し、利用上限に達しました。時間をおいてお試しください。';
  }

  return '現在AIが文章を生成できません。時間をおいて再度お試しください。';
};

const Chat = ({ level, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    const startInitialConversation = async () => {
      if (messages.length > 0) {
        return;
      }

      setIsTyping(true);

      timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        try {
          setStatusMessage('');
          const response = await generateAIResponse('', level, []);
          if (!isMounted) return;
          setStatusMessage('');
          const cleanResponse = response.replace(/\[(?:RESOLVED|ABANDONED|ABUSIVE|CONTINUE)\]/gi, '').trim();
          setMessages([{ role: 'user', content: cleanResponse }]);
        } catch (error) {
          if (!isMounted) return;
          setStatusMessage(buildGenerationErrorMessage(error));
        } finally {
          if (isMounted) setIsTyping(false);
        }
      }, Math.max(500, level.delayMs / 2));
    };

    startInitialConversation();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [level, messages.length]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!input.trim() || isTyping || isTerminated) {
      return;
    }

    const playerMessage = { role: 'assistant', content: input.trim() };
    const newMessages = [...messages, playerMessage];

    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    if (newMessages.filter((message) => message.role === 'assistant').length >= level.maxTurns) {
      setTimeout(() => {
        const terminateMsg = level.isBlacklist ? TERMINATION_MESSAGES.harsh : TERMINATION_MESSAGES.normal;
        setMessages((prev) => [...prev, { role: 'user', content: terminateMsg }]);
        setIsTerminated(true);
        setTerminationReason('abandoned');
        setIsTyping(false);
      }, level.delayMs);
      return;
    }

    setTimeout(async () => {
      try {
        setStatusMessage('');
        const aiResponse = await generateAIResponse(playerMessage.content, level, newMessages);
        setStatusMessage('');

        let finalResponse = aiResponse;
        let reason = null;

        if (finalResponse.includes('[RESOLVED]')) {
          finalResponse = finalResponse.replace(/\[RESOLVED\]/g, '').trim();
          reason = 'resolved';
        } else if (finalResponse.includes('[ABANDONED]')) {
          finalResponse = finalResponse.replace(/\[ABANDONED\]/g, '').trim();
          reason = 'abandoned';
        } else if (finalResponse.includes('[ABUSIVE]')) {
          finalResponse = finalResponse.replace(/\[ABUSIVE\]/g, '').trim();
          reason = 'abusive';
        }
        
        finalResponse = finalResponse.replace(/\[CONTINUE\]/g, '').trim();

        setMessages((prev) => [...prev, { role: 'user', content: finalResponse }]);

        if (reason) {
          setIsTerminated(true);
          setTerminationReason(reason);
        } else if (level.id === 5 && Math.random() < 0.15 && newMessages.length > 4) {
          setMessages((prev) => [...prev, { role: 'user', content: TERMINATION_MESSAGES.randomLevel5 }]);
          setIsTerminated(true);
          setTerminationReason('abandoned');
        }
      } catch (error) {
        setStatusMessage(buildGenerationErrorMessage(error));
      } finally {
        setIsTyping(false);
      }
    }, level.delayMs);
  };

  const handleRetry = async () => {
    if (isTyping || isTerminated) return;
    setIsTyping(true);
    setStatusMessage('');

    try {
      if (messages.length === 0) {
        const response = await generateAIResponse('', level, []);
        const cleanResponse = response.replace(/\[(?:RESOLVED|ABANDONED|ABUSIVE|CONTINUE)\]/gi, '').trim();
        setMessages([{ role: 'user', content: cleanResponse }]);
      } else {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'assistant') {
          const aiResponse = await generateAIResponse(lastMessage.content, level, messages);
        let finalResponse = aiResponse;
        let reason = null;

        if (finalResponse.includes('[RESOLVED]')) {
          finalResponse = finalResponse.replace(/\[RESOLVED\]/g, '').trim();
          reason = 'resolved';
        } else if (finalResponse.includes('[ABANDONED]')) {
          finalResponse = finalResponse.replace(/\[ABANDONED\]/g, '').trim();
          reason = 'abandoned';
        } else if (finalResponse.includes('[ABUSIVE]')) {
          finalResponse = finalResponse.replace(/\[ABUSIVE\]/g, '').trim();
          reason = 'abusive';
        }

        finalResponse = finalResponse.replace(/\[CONTINUE\]/g, '').trim();

        setMessages((prev) => [...prev, { role: 'user', content: finalResponse }]);

        if (reason) {
          setIsTerminated(true);
          setTerminationReason(reason);
        }
        }
      }
    } catch (error) {
      setStatusMessage(buildGenerationErrorMessage(error));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <button className="new-chat-btn" type="button" onClick={onBack}>
          <div className="btn-content">
            <div className="new-chat-icon">
              <Bot size={16} />
            </div>
            <span>New chat</span>
          </div>
          <Plus size={16} />
        </button>

        <div className="sidebar-history-dummy">
          <p className="sidebar-section-title">Today</p>
          <div className="sidebar-item active">
            {level.emoji} {level.name}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-profile" type="button" onClick={onBack}>
            <ArrowUp size={16} /> レベル選択に戻る
          </button>
        </div>
      </aside>

      <main className="chat-container">
        <header className="mobile-header">
          <button type="button" onClick={onBack}>
            <Menu size={24} />
          </button>
          <span>
            {level.emoji} {level.name} - You Are GPT
          </span>
          <div style={{ width: 24 }} />
        </header>

        <div className="chat-scroll-area">
          <div className="chat-history">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role}`}>
                <div className="message-content">
                  <div className="avatar">
                    {msg.role === 'user' ? (
                      <div className="user-icon">
                        <User size={20} />
                      </div>
                    ) : (
                      <div className="gpt-icon">
                        <Bot size={20} />
                      </div>
                    )}
                  </div>
                  <div className="message-bubble">
                    <div className="text">{msg.content}</div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message-row user">
                <div className="message-content">
                  <div className="avatar">
                    <div className="user-icon">
                      <User size={20} />
                    </div>
                  </div>
                  <div className="message-bubble typing-indicator-container">
                    <span className="typing-text">相手が次の要求を考えています...</span>
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="chat-input-area">
          {level.isBlacklist && !isTerminated && (
            <div className="blacklist-warning-bar">
              ⚠️ <b>Blacklist:</b> このユーザーは要注意人物に指定されています。暴言や理不尽な対応に気をつけてください。
            </div>
          )}
          {statusMessage && (
            <div className="footer-disclaimer" style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
              <span>{statusMessage}</span>
              <button onClick={handleRetry} style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                リトライ
              </button>
            </div>
          )}
          <div className="input-container">
            {terminationReason ? (
              <div className={`termination-banner ${terminationReason}`}>
                <div className="term-content">
                  {terminationReason === 'resolved' && (
                    <p>🎉 <b>Mission Cleared!</b><br/>ユーザーの要望を見事解決し、満足させました！</p>
                  )}
                  {terminationReason === 'abandoned' && (
                    <p>💨 <b>User Left...</b><br/>ユーザーは解決を諦めて離脱しました。</p>
                  )}
                  {terminationReason === 'abusive' && (
                    <p>🚨 <b>Warning: Abuse Detected</b><br/>ユーザーが怒って通報しました。サポート失格です。</p>
                  )}
                </div>
                <button onClick={onBack} className="return-home-btn">ホームに戻る</button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className={`input-form ${isTerminated ? 'terminated' : ''}`}>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={isTerminated ? '会話は終了しました' : 'GPTとして返信を書く...'}
                  disabled={isTyping || isTerminated}
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage(event);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping || isTerminated}
                  className="send-button"
                >
                  {isTyping ? <Loader2 size={16} className="spin" /> : <ArrowUp size={16} />}
                </button>
              </form>
            )}
          </div>
          <div className="footer-disclaimer">
            あなたは GPT 側です。表示される相手は「人間を演じるAI」です。
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
