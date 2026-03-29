import React from 'react';
import { LEVELS } from '../lib/levels';
import { Sparkles, ArrowUp, Zap, Code, Briefcase, Frown, Flame } from 'lucide-react';
import './Home.css';

const ICONS = [Sparkles, ArrowUp, Zap, Code, Briefcase, Frown, Flame];

const Home = ({ onSelectLevel }) => {
  return (
    <div className="home-layout">
      <aside className="home-sidebar">
        <button className="home-new-chat-btn" type="button">
          <div className="home-btn-content">
            <div className="home-gpt-icon">
              <Sparkles size={16} />
            </div>
            <span>New chat</span>
          </div>
        </button>
      </aside>

      <main className="home-main">
        <div className="home-content">
          <p className="home-subtitle">ユーザーの要望に応えましょう</p>
          <div className="home-logo-container">
            <div className="chatgpt-logo-large">
              <Sparkles size={40} color="var(--text-primary)" />
            </div>
          </div>
          <h1 className="home-title">You Are GPT</h1>
          <h2 className="home-prompt-title">
            ChatBotの気持ちを体験してみましょう
          </h2>

          <div className="suggestion-grid">
            {LEVELS.map((level, i) => {
              const IconComponent = ICONS[i % ICONS.length];

              return (
                <button
                  key={level.id}
                  type="button"
                  className={`suggestion-card ${level.isBlacklist ? 'is-blacklist' : ''}`}
                  onClick={() => onSelectLevel(level)}
                >
                  <div className="sugg-content">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {level.emoji} {level.name}
                      {level.isBlacklist && (
                        <span className="blacklist-badge">Blacklist</span>
                      )}
                    </h3>
                    <p>{level.description}</p>
                  </div>
                  <div className="sugg-icon">
                    <div className="sugg-action-btn">
                      <IconComponent size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
