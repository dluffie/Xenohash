import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { MiningProvider } from './context/MiningContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <MiningProvider>
          <App />
        </MiningProvider>
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)