const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== ÉTAT ==========
let currentState = { locked: true, source: 'system' };

// ========== CONNEXION TiDB AVEC SSL ==========
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_lock',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.log('⚠️ DB non connectée, mode démo');
        console.log('📌 Erreur détaillée:', err.message);
    } else {
        console.log('✅ Connecté à TiDB Cloud avec SSL');
    }
});

// ========== WEBSOCKET ==========
io.on('connection', (socket) => {
    console.log('✅ Client WS connecté:', socket.id);
    
    socket.emit('state', currentState);
    
    socket.on('toggle', (data) => {
        console.log('📱 Commande toggle:', data);
        currentState = { locked: data.locked, source: data.source };
        io.emit('state', currentState);
        
        if (!data.locked) {
            setTimeout(() => {
                if (!currentState.locked) {
                    currentState = { locked: true, source: 'auto' };
                    io.emit('state', currentState);
                    console.log('🔒 Auto-verrouillage');
                }
            }, 5000);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Client déconnecté:', socket.id);
    });
});

// ========== API REST ==========
app.get('/api/state', (req, res) => {
    res.json(currentState);
});

// Supprimez simplement tous les setTimeout
app.post('/api/verify', (req, res) => {
    const { pin } = req.body;
    
    if (pin === '1234') {
        currentState = { locked: false, source: 'api' };
        io.emit('state', currentState);
        // PAS de setTimeout
        res.json({ success: true, message: '✅ Accès autorisé', user: 'Admin' });
    } 
    else {
        res.json({ success: false, message: '❌ Code incorrect' });
    }
});

// Dans le WebSocket
socket.on('toggle', (data) => {
    currentState = { locked: data.locked, source: data.source };
    io.emit('state', currentState);
    // PAS de setTimeout
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket prêt - Socket.IO v4`);
});