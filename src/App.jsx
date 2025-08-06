import React, { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import NFC from './NFC'


function App() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  
  const CORRECT_PASSWORD = '1234' // You can change this to any 4-digit password
  
  const handlePasswordChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPassword(value)
    setError('')
  }
  
  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    
    if (password.length !== 4) {
      setError('Password must be 4 digits')
      return
    }
    
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true)
      setError('')
    } else {
      setAttempts(prev => prev + 1)
      setError(`Incorrect password. Attempt ${attempts + 1}`)
      setPassword('')
    }
  }
  
  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    setError('')
    setAttempts(0)
  }
  
  if (isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#d35c57' }}>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="mb-4 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-2"
            style={{ color: '#d35c57' }}
          >
            <Lock size={16} />
            Logout
          </button>
        </div>
        <NFC />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ backgroundColor: '#d35c57' }}>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
               style={{ backgroundColor: '#d35c57' }}>
            <Lock className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#d35c57' }}>
            NFC Handler Access
          </h1>
          <p className="text-gray-600 mt-2">Enter 4-digit password to continue</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-widest p-4 border-2 rounded-lg focus:outline-none focus:border-opacity-80"
              style={{ 
                borderColor: error ? '#ef4444' : '#d35c57',
                color: '#d35c57'
              }}
              maxLength="4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e)
                }
              }}
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={password.length !== 4}
            className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: '#d35c57' }}
          >
            <Unlock size={16} />
            Access NFC Handler
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  password.length >= i ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ backgroundColor: '#d35c57' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App