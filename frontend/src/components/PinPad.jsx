// src/components/PinPad.jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'https://pincode-pl0p.onrender.com';

const PinPad = () => {
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isLocked, setIsLocked] = useState(true);
    const [socket, setSocket] = useState(null);

    // ========== WebSocket Connection ==========
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        
        newSocket.on('connect', () => {
            console.log('✅ WebSocket connecté');
        });
        
        newSocket.on('lockState', (data) => {
            console.log('📩 État reçu:', data);
            setIsLocked(data.locked);
        });
        
        newSocket.on('disconnect', () => {
            console.log('❌ WebSocket déconnecté');
        });
        
        setSocket(newSocket);
        
        return () => {
            newSocket.close();
        };
    }, []);

    // ========== Vérification PIN ==========
    const verifyPin = async (pinCode) => {
        try {
            const response = await fetch('https://pincode-pl0p.onrender.com/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinCode }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage(data.message || '✅ Accès autorisé');
                setMessageType('success');
                // L'état WebSocket va automatiquement mettre à jour l'UI
            } else {
                setMessage(data.message || '❌ Code incorrect');
                setMessageType('error');
            }
        } catch (error) {
            setMessage('❌ Erreur de connexion');
            setMessageType('error');
        }

        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 3000);
    };

    const handleKeyPress = async (key) => {
        if (key === 'backspace') {
            setPin(prev => prev.slice(0, -1));
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

    const getPinSlotClass = (index) => {
        const isActive = pin.length > index;
        return `w-4 h-4 rounded-full transition-all duration-300 ${
            isActive 
                ? 'bg-white border border-white scale-110' 
                : 'bg-gray-700 border border-gray-600'
        }`;
    };

    return (
        <div className="min-h-screen bg-[#131313] flex flex-col items-center justify-center">
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

            {isLocked && (
                <>
                    <div className="flex space-x-4 mb-8">
                        {[0, 1, 2, 3].map((_, index) => (
                            <div key={index} className={getPinSlotClass(index)}></div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleKeyPress(num.toString())}
                                className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <span className="text-white text-2xl font-medium">{num}</span>
                            </button>
                        ))}
                        
                        <button className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700">
                            <span className="material-symbols-outlined text-gray-400 text-2xl">fingerprint</span>
                        </button>
                        
                        <button onClick={() => handleKeyPress('0')} className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all active:scale-95">
                            <span className="text-white text-2xl font-medium">0</span>
                        </button>
                        
                        <button onClick={() => handleKeyPress('backspace')} className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all active:scale-95">
                            <span className="material-symbols-outlined text-gray-400 hover:text-white text-2xl">backspace</span>
                        </button>
                    </div>
                </>
            )}

            {!isLocked && (
                <button className="mt-8 px-6 py-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
                    🔓 Porte ouverte
                </button>
            )}

            {message && (
                <div className={`mt-4 px-4 py-2 rounded-xl ${
                    messageType === 'success' 
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}>
                    {message}
                </div>
            )}

            <div className="mt-8 flex items-center space-x-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                    socket?.connected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-green-500 tracking-widest uppercase font-medium">
                    {socket?.connected ? 'CONNECTÉ' : 'DÉCONNECTÉ'}
                </span>
            </div>
        </div>
    );
};

export default PinPad;