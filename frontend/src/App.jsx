import React, { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";

// Connection options fixed to prevent duplicate sockets
const socket = io("http://localhost:5000", {
"), {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(" // start code here ");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    // 1. User list listener
    const handleUserJoined = (usersList) => {
      console.log("Realtime User List Received:", usersList);
      setUsers(usersList);
    };

    // 2. Code update listener (Set Code for editor sync)
    const handleCodeUpdate = (newCode) => {
      setCode(newCode);
    };

    const handleUserTyping = (newUserTyping) => {
      if (newUserTyping) {
        setTyping(`${newUserTyping} is typing...`);
        // ADDED: Auto-clear typing status after 2 seconds
        setTimeout(() => setTyping(""), 2000);
      }
    };

    const handleLanguageUpdate = (lang) => {
      setLanguage(lang);
    };

    socket.on("userJoined", handleUserJoined);
    socket.on("codeUpdate", handleCodeUpdate);
    socket.on("userTyping", handleUserTyping);
    socket.on("languageUpdate", handleLanguageUpdate);

    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("codeUpdate", handleCodeUpdate);
      socket.off("userTyping", handleUserTyping);
      socket.off("languageUpdate", handleLanguageUpdate);
    };
  }, []); // ADDED: [] Dependency array so event listeners bind correctly once

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leave", { roomId, userName });
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here ");
    setLanguage("javascript");
    setUsers([]);
  };

  const copyRoomID = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess("Copied!");
      setTimeout(() => {
        setCopySuccess("");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    // ADDED: Socket emit for real-time language update
    socket.emit("languageChange", { roomId, language: selectedLanguage });
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join code Room</h1>
          <input
            type="text"
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="room-info">
        <h2>Code Room: {roomId}</h2>
        <button onClick={copyRoomID} className="copy-button">
          Copy Id
        </button>
        {copySuccess && <span className="copy-success">{copySuccess}</span>}

        <h3>Users in Room:</h3>
        <div className="users-list">
          {users && users.length > 0 ? (
            users.map((user, index) => (
              <div className="user-card" key={index}>
                {typeof user === "string" ? user : user.userName || user.username}
              </div>
            ))
          ) : (
            <div className="user-card">No users in room</div>
          )}
        </div>

        <p className="typing-indicator">{typing}</p>

        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>

        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100vh"
          theme="vs-dark"
          defaultLanguage="javascript"
          language={language}
          value={code}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default App;

