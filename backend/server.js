const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let currentState = { locked: true };
let clients = [];

// Base de données
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

db.connect((err) => {
    if (err) {
        console.error('❌ DB erreur:', err.message);
        process.exit(1);
    }
    console.log('✅ Connecté à TiDB');
});

// WebSocket pur
wss.on('connection', (ws) => {
    console.log('✅ Client WS connecté');
    clients.push(ws);
    
    ws.send(JSON.stringify({ type: 'state', locked: currentState.locked }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'toggle') {
                currentState.locked = data.locked;
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'state', locked: currentState.locked }));
                    }
                });
            }
        } catch(e) {}
    });
    
    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
    });
});

// API
app.get('/api/state', (req, res) => {
    res.json(currentState);
});

app.post('/api/verify', (req, res) => {
    const { pin } = req.body;
    
    if (pin === '1234') {
        currentState.locked = false;
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'state', locked: false }));
            }
        });
        res.json({ success: true, message: '✅ Accès autorisé' });
    } else {
        res.json({ success: false, message: '❌ Code incorrect' });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur sur https://pincode-pl0p.onrender.com`);
    console.log(`🔌 WebSocket prêt`);
});