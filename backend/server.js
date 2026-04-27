const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Utilisation du port dynamique de Render
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== ÉTAT GLOBAL ==========
let currentState = { locked: true, source: 'system' };

// ========== CONNEXION TiDB CLOUD ==========
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.error('❌ ERRE_DB:', err.message);
        process.exit(1);
    }
    console.log('✅ Connecté à TiDB Cloud');
    
    const createTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(50) NOT NULL,
            pin VARCHAR(4) NOT NULL
        )`;
    
    db.query(createTable, (err) => {
        if (err) console.log('⚠️ Table users vérifiée');
    });
});

// ========== GESTION WEBSOCKET AVEC HEARTBEAT ==========
const wss = new WebSocket.Server({ server });

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('✅ Nouveau client WebSocket (ESP32 ou Web)');
    ws.isAlive = true;

    // Réception du "pong" pour maintenir la connexion
    ws.on('pong', () => { ws.isAlive = true; });

    // Envoyer l'état actuel immédiatement après la connexion
    ws.send(JSON.stringify({ type: 'state', locked: currentState.locked }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Message reçu:', data);

            if (data.type === 'toggle') {
                currentState = { locked: data.locked, source: data.source || 'device' };
                broadcast({ type: 'state', locked: currentState.locked });
            }
        } catch (e) {
            console.error('❌ Erreur format JSON:', e.message);
        }
    });

    ws.on('close', () => console.log('❌ Client déconnecté'));
});

// Intervalle de sécurité (Keep-alive) toutes les 30 secondes
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping(); // Envoie un "ping", le client doit répondre par un "pong"
    });
}, 30000);

// ========== ROUTES API REST ==========

// Vérification du PIN
app.post('/api/verify', (req, res) => {
    const { pin } = req.body;
    
    if (!pin) return res.status(400).json({ success: false, message: 'PIN manquant' });

    db.query('SELECT name FROM users WHERE pin = ?', [pin], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (results.length > 0) {
            console.log(`🔓 Accès validé pour ${results[0].name}`);
            
            // Mettre à jour l'état et notifier les clients WebSocket (ESP32)
            currentState = { locked: false, source: 'keypad' };
            broadcast({ type: 'state', locked: false });

            res.json({ success: true, user: results[0].name });
        } else {
            res.json({ success: false, message: 'Code incorrect' });
        }
    });
});

// Récupérer l'état actuel (pour le dashboard web)
app.get('/api/state', (req, res) => {
    res.json(currentState);
});

// Santé du serveur
app.get('/health', (req, res) => res.send('OK'));

// ========== DÉMARRAGE DU SERVEUR ==========
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
});