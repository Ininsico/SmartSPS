import React, { useState } from 'react';
import LandingPage from './LandingPage';
import MeetingRoom from './MeetingRoom';

function App() {
  const [inMeeting, setInMeeting] = useState(false);
  const [roomId, setRoomId] = useState('');

  const handleJoin = (id) => {
    setRoomId(id);
    setInMeeting(true);
  };

  const handleLeave = () => {
    setInMeeting(false);
    setRoomId('');
  };

  return (
    <div className="app-root">
      {inMeeting ? (
        <MeetingRoom roomId={roomId} onLeave={handleLeave} />
      ) : (
        <LandingPage onJoin={handleJoin} />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .app-root {
          min-height: 100vh;
          background-color: var(--bg-main);
          color: var(--text-primary);
        }
      `}} />
    </div>
  );
}

export default App;
