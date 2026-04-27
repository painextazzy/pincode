const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT ;

app.use(cors());
app.use(express.json());

// ========== ÉTAT ==========
let currentState = { locked: true, source: 'system' };
let clients = [];

// ========== CONNEXION TiDB ==========
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
        console.error('❌ ERREUR: Connexion DB impossible');
        console.error('📌 Vérifie tes variables d\'environnement sur Render');
        process.exit(1);
    }
    console.log('✅ Connecté à TiDB Cloud');
    
    // Créer la table si elle n'existe pas
    const createTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(50) NOT NULL,
            pin VARCHAR(4) NOT NULL
        )`;
    
    db.query(createTable, (err) => {
        if (err) console.log('⚠️ Table déjà existante');
        else console.log('✅ Table users prête');
    });
});

// ========== WEBSOCKET PUR ==========
wss.on('connection', (ws) => {
    console.log('✅ Client WebSocket connecté');
    clients.push(ws);
    
    ws.send(JSON.stringify({ type: 'state', locked: currentState.locked }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Reçu:', data);
            
            if (data.type === 'toggle') {
                currentState = { locked: data.locked, source: data.source };
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'state', locked: currentState.locked }));
                    }
                });
            }
        } catch (e) {
            console.error('Erreur parsing:', e);
        }
    });
    
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

// ========== API REST ==========
app.get('/api/state', (req, res) => {
    res.json(currentState);
});

app.post('/api/verify', (req, res) => {
    const { pin } = req.body;
    console.log('🔑 PIN reçu:', pin);
    
    if (!pin || pin.length !== 4) {
        return res.status(400).json({
            success: false,
            message: 'PIN invalide (4 chiffres requis)'
        });
    }
    
    // Vérification dans TiDB
    db.query('SELECT name, pin FROM users WHERE pin = ?', [pin], (err, results) => {
        if (err) {
            console.error('❌ Erreur SQL:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur'
            });
        }
        
        if (results.length > 0) {
            console.log(`✅ Accès autorisé pour: ${results[0].name}`);
            currentState = { locked: false, source: 'api' };
            
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'state', locked: false }));
                }
            });
            
            res.json({
                success: true,
                message: '✅ Accès autorisé',
                user: results[0].name
            });
        } else {
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
    console.log(`🚀 Serveur sur https://pincode-pl0p.onrender.com`);
    console.log(`🔌 WebSocket prêt`);
});