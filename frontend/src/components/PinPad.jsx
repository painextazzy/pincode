// src/components/PinPad.jsx
import React, { useState, useEffect } from 'react';

const PinPad = () => {
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isLocked, setIsLocked] = useState(true);
    const [socket, setSocket] = useState(null);
    const [wsReady, setWsReady] = useState(false);

    // Connexion WebSocket pur (pas Socket.IO)
    useEffect(() => {
        // WebSocket standard
        const ws = new WebSocket('wss://pincode-pl0p.onrender.com');
        
        ws.onopen = () => {
            console.log('✅ WebSocket connecté');
            setWsReady(true);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 Message reçu:', data);
                
                if (data.type === 'state') {
                    setIsLocked(data.locked);
                }
            } catch (error) {
                console.error('Erreur parsing:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('❌ Erreur WebSocket:', error);
            setWsReady(false);
        };
        
        ws.onclose = () => {
            console.log('❌ WebSocket déconnecté');
            setWsReady(false);
            // Tentative de reconnexion après 3 secondes
            setTimeout(() => {
                if (ws.readyState === WebSocket.CLOSED) {
                    // La reconnexion se fera via le useEffect
                    setSocket(null);
                }
            }, 3000);
        };
        
        setSocket(ws);
        
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    // Envoyer commande toggle
    const sendToggle = (lockState) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({
                type: 'toggle',
                locked: lockState,
                source: 'frontend'
            });
            socket.send(message);
            console.log('📤 Envoyé:', message);
        } else {
            console.log('⚠️ WebSocket non connecté');
        }
    };

    // Verrouiller à distance
    const remoteLock = () => {
        sendToggle(true);
        setMessage('🔒 Serrure verrouillée');
        setMessageType('success');
        setTimeout(() => setMessage(''), 2000);
    };

    // Vérifier le PIN via API REST
    const verifyPin = async (pinCode) => {
        try {
            const response = await fetch('https://pincode-pl0p.onrender.com/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinCode }),
            });
            const data = await response.json();
            setMessage(data.message);
            setMessageType(data.success ? 'success' : 'error');
            
            if (data.success) {
                // Le WebSocket mettra à jour l'état automatiquement
                console.log('✅ Accès autorisé, WebSocket va mettre à jour');
            }
        } catch (error) {
            setMessage('❌ Erreur de connexion');
            setMessageType('error');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleKeyPress = (key) => {
        if (key === 'backspace') {
            setPin(prev => prev.slice(0, -1));
        } else if (!isNaN(key)) {
            if (pin.length < 4) {
                const newPin = pin + key;
                setPin(newPin);
                if (newPin.length === 4) {
                    verifyPin(newPin);
                    setPin('');
                }
            }
        }
    };

    const getPinSlotClass = (index) => {
        const isActive = pin.length > index;
        return `w-4 h-4 rounded-full transition-all duration-300 ${
            isActive ? 'bg-white border border-white scale-110' : 'bg-gray-700 border border-gray-600'
        }`;
    };

    return (
        <div className="min-h-screen bg-[#131313] flex flex-col items-center justify-center">
            {/* Indicateur de connexion WebSocket */}
            <div className="fixed top-4 right-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-400">{wsReady ? 'Connecté' : 'Déconnecté'}</span>
            </div>

            {/* Header */}
            <header className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full border transition-all duration-300 ${
                    isLocked ? 'bg-gray-800 border-gray-700' : 'bg-green-500/20 border-green-500'
                }`}>
                    <span className="material-symbols-outlined text-3xl transition-all duration-300">
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
                        {isLocked ? 'Entrez le code' : 'Porte déverrouillée'}
                    </p>
                </div>
            </header>

            {/* PinPad (seulement si verrouillé) */}
            {isLocked && (
                <>
                    <div className="flex space-x-4 mb-8">
                        {[0, 1, 2, 3].map((_, i) => (
                            <div key={i} className={getPinSlotClass(i)}></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                        {[1,2,3,4,5,6,7,8,9].map((n) => (
                            <button key={n} onClick={() => handleKeyPress(n.toString())}
                                className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all active:scale-95">
                                <span className="text-white text-2xl font-medium">{n}</span>
                            </button>
                        ))}
                        <button className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700">
                            <span className="material-symbols-outlined text-gray-400 text-2xl">fingerprint</span>
                        </button>
                        <button onClick={() => handleKeyPress('0')}
                            className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all active:scale-95">
                            <span className="text-white text-2xl font-medium">0</span>
                        </button>
                        <button onClick={() => handleKeyPress('backspace')}
                            className="flex items-center justify-center h-16 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all active:scale-95">
                            <span className="material-symbols-outlined text-gray-400 hover:text-white text-2xl">backspace</span>
                        </button>
                    </div>
                </>
            )}

            {/* Bouton Verrouiller (si déverrouillé) */}
            {!isLocked && (
                <button onClick={remoteLock}
                    className="mt-8 px-6 py-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/30 transition-all">
                    🔒 Verrouiller maintenant
                </button>
            )}

            {/* Message de statut */}
            {message && (
                <div className={`mt-4 px-4 py-2 rounded-xl ${
                    messageType === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default PinPad;