// src/components/PinPad.jsx
import React, { useState } from 'react';

const PinPad = () => {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLocked, setIsLocked] = useState(true);

  // Récupérer l'URL depuis .env
  const API_URL = import.meta.env.VITE_API_URL;

  const handleKeyPress = async (key) => {
    if (key === 'backspace') {
      setPin(prev => prev.slice(0, -1));
      setMessage('');
    } else if (!isNaN(key)) {
      if (pin.length < 4) {
        const newPin = pin + key;
        setPin(newPin);
        
        if (newPin.length === 4) {
          await verifyPin(newPin);
          setPin('');
        }
      }
    }
  };

  const verifyPin = async (pinCode) => {
    try {
      // Utiliser API_URL au lieu de localhost en dur
      const response = await fetch(`${API_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinCode }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message || 'Accès autorisé');
        setMessageType('success');
        setIsLocked(false);
      } else {
        setMessage(data.message || 'Code incorrect');
        setMessageType('error');
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('Erreur de connexion au serveur');
      setMessageType('error');
    }

    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const handleLock = () => {
    setIsLocked(true);
    setMessage('Serrure verrouillée');
    setMessageType('info');
    setTimeout(() => setMessage(''), 2000);
  };

  const getPinSlotClass = (index) => {
    const isActive = pin.length > index;
    return `w-4 h-4 rounded-full pin-slot-inner transition-all duration-300 ${
      isActive 
        ? 'bg-white border border-white scale-110' 
        : 'bg-gray-700 border border-gray-600'
    }`;
  };

  return (
    <div className="min-h-screen bg-[#131313] flex flex-col items-center justify-center">
      {/* Header */}
      <header className="flex flex-col items-center text-center space-y-4 mb-8">
        <div className={`flex items-center justify-center w-16 h-16 rounded-full border transition-all duration-300 ${
          isLocked 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-green-500/20 border-green-500'
        }`}>
          <span className={`material-symbols-outlined text-3xl transition-all duration-300 ${
            isLocked ? 'text-white' : 'text-green-500'
          }`}>
            {isLocked ? 'lock' : 'lock_open'}
          </span>
        </div>
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight transition-all duration-300 ${
            isLocked ? 'text-white' : 'text-green-500'
          }`}>
            {isLocked ? 'Verrouillé' : 'Déverrouillé'}
          </h1>
          <p className="text-gray-400">
            {isLocked 
              ? 'Entrez le code pour déverrouiller' 
              : 'Porte déverrouillée'}
          </p>
        </div>
      </header>

      {/* PIN Display */}
      {isLocked && (
        <div className="flex space-x-4 mb-8">
          {[0, 1, 2, 3].map((_, index) => (
            <div key={index} className={getPinSlotClass(index)}></div>
          ))}
        </div>
      )}

      {/* Keypad */}
      {isLocked && (
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 active:scale-95"
            >
              <span className="text-white text-2xl font-medium">{num}</span>
            </button>
          ))}
          
          <button
            className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-green-500 transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-gray-400 hover:text-green-500 text-2xl">fingerprint</span>
          </button>
          
          <button
            onClick={() => handleKeyPress('0')}
            className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 active:scale-95"
          >
            <span className="text-white text-2xl font-medium">0</span>
          </button>
          
          <button
            onClick={() => handleKeyPress('backspace')}
            className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-gray-400 hover:text-white text-2xl">backspace</span>
          </button>
        </div>
      )}

      {/* Bouton Verrouiller */}
      {!isLocked && (
        <button
          onClick={handleLock}
          className="mt-8 flex items-center space-x-2 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined text-red-400 text-xl">lock</span>
          <span className="text-red-400 font-medium">Verrouiller</span>
        </button>
      )}

      {/* Message */}
      {message && (
        <div className={`mt-6 px-4 py-2 rounded-lg text-center ${
          messageType === 'success' 
            ? 'bg-green-500/20 text-green-500 border border-green-500/30'
            : messageType === 'error'
            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
            : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
        }`}>
          {message}
        </div>
      )}

      {/* Status Badge */}
      <div className={`mt-6 flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-300 ${
        isLocked 
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-yellow-500/30 bg-yellow-500/10'
      }`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          isLocked ? 'bg-green-500' : 'bg-yellow-500'
        }`}></div>
        <span className={`text-xs tracking-widest uppercase font-medium ${
          isLocked ? 'text-green-500' : 'text-yellow-500'
        }`}>
          {isLocked ? 'SYSTÈME VERROUILLÉ' : 'SYSTÈME DÉVERROUILLÉ'}
        </span>
      </div>
    </div>
  );
};

export default PinPad;