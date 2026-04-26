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

// ========== CONNEXION TiDB (OBLIGATOIRE) ==========
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

// CONNEXION - Si erreur, le serveur ne démarre pas
db.connect((err) => {
    if (err) {
        console.error('❌ ERREUR FATALE: Connexion DB impossible');
        console.error('📌 Erreur:', err.message);
        console.error('📌 Vérifiez vos variables DB dans Render:');
        console.error('   - DB_HOST');
        console.error('   - DB_USER');
        console.error('   - DB_PASSWORD');
        console.error('   - DB_NAME');
        process.exit(1); // Arrête le serveur si DB non connectée
    }
    console.log('✅ Connecté à TiDB Cloud avec SSL');
});

// ========== WEBSOCKET ==========
io.on('connection', (socket) => {
    console.log('✅ Client WS connecté:', socket.id);
    socket.emit('state', currentState);
    
    socket.on('toggle', (data) => {
        console.log('📱 Commande toggle:', data);
        currentState = { locked: data.locked, source: data.source };
        io.emit('state', currentState);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Client déconnecté:', socket.id);
    });
});

// ========== API REST ==========
app.get('/api/state', (req, res) => {
    res.json(currentState);
});

// Vérification du PIN dans la base de données
app.post('/api/verify', (req, res) => {
    const { pin } = req.body;
    console.log('🔑 PIN reçu:', pin);
    
    if (!pin || pin.length !== 4) {
        return res.status(400).json({
            success: false,
            message: 'PIN invalide (4 chiffres requis)'
        });
    }
    
    // Requête vers la base TiDB
    db.query('SELECT name, pin FROM users WHERE pin = ?', [pin], (err, results) => {
        if (err) {
            console.error('❌ Erreur SQL:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
        
        if (results.length > 0) {
            // PIN trouvé en base
            console.log(`✅ Accès autorisé pour: ${results[0].name}`);
            currentState = { locked: false, source: 'api' };
            io.emit('state', currentState);
            
            res.json({
                success: true,
                message: '✅ Accès autorisé',
                user: results[0].name
            });
        } else {
            // PIN non trouvé
            console.log(`❌ Code incorrect: ${pin}`);
            res.json({
                success: false,
                message: '❌ Code incorrect'
            });
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket prêt - Socket.IO v4`);
});