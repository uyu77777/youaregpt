import { useState } from 'react';
import Home from './components/Home';
import Chat from './components/Chat';

function App() {
  const [currentLevel, setCurrentLevel] = useState(null);

  const startChat = (level) => {
    setCurrentLevel(level);
  };

  const goHome = () => {
    setCurrentLevel(null);
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {currentLevel === null ? (
        <Home onSelectLevel={startChat} />
      ) : (
        <Chat level={currentLevel} onBack={goHome} />
      )}
    </div>
  );
}

export default App;
