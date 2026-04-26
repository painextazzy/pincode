// backend/server.js
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
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration TiDB
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
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
        console.error('❌ Erreur de connexion TiDB:', err.message);
        process.exit(1);
    }
    console.log('✅ Connecté à TiDB Cloud');
});

// ============ WebSocket ============
let currentLockState = {
    locked: true,
    lastUpdated: new Date().toISOString(),
    source: 'system'
};

// Clients connectés
const connectedClients = new Set();

io.on('connection', (socket) => {
    console.log('✅ Client connecté:', socket.id);
    connectedClients.add(socket.id);
    
    // Envoyer l'état actuel au nouveau client
    socket.emit('lockState', currentLockState);
    
    // Client demande à verrouiller/déverrouiller
    socket.on('toggleLock', async (data) => {
        console.log('📱 Commande reçue:', data);
        
        const { action, source } = data;
        
        if (action === 'unlock') {
            currentLockState = {
                locked: false,
                lastUpdated: new Date().toISOString(),
                source: source || 'websocket'
            };
            
            // Auto-verrouillage après 5 secondes
            setTimeout(() => {
                currentLockState = {
                    locked: true,
                    lastUpdated: new Date().toISOString(),
                    source: 'auto'
                };
                broadcastState();
                console.log('🔒 Auto-verrouillage');
            }, 5000);
        } 
        else if (action === 'lock') {
            currentLockState = {
                locked: true,
                lastUpdated: new Date().toISOString(),
                source: source || 'websocket'
            };
        }
        
        broadcastState();
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Client déconnecté:', socket.id);
        connectedClients.delete(socket.id);
    });
});

function broadcastState() {
    io.emit('lockState', currentLockState);
}

// ============ API REST ============
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        websocket: true,
        clients: connectedClients.size,
        endpoints: {
            verify: 'POST /api/verify'
        }
    });
});

app.post('/api/verify', (req, res) => {
    const { pin } = req.body;
    
    if (!pin || pin.length !== 4) {
        return res.status(400).json({
            success: false,
            message: 'PIN invalide (4 chiffres requis)'
        });
    }
    
    const query = 'SELECT name FROM users WHERE pin = ?';
    
    db.query(query, [pin], (err, results) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
        
        if (results.length > 0) {
            // Déverrouiller via WebSocket
            currentLockState = {
                locked: false,
                lastUpdated: new Date().toISOString(),
                source: 'api'
            };
            broadcastState();
            
            // Auto-verrouillage après 5 secondes
            setTimeout(() => {
                currentLockState = {
                    locked: true,
                    lastUpdated: new Date().toISOString(),
                    source: 'auto'
                };
                broadcastState();
            }, 5000);
            
            res.json({
                success: true,
                message: '✅ Accès autorisé',
                user: results[0].name
            });
        } else {
            res.json({
                success: false,
                message: '❌ Code incorrect'
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket prêt`);
});