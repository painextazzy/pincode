const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== ÉTAT ==========
let currentState = { locked: true, source: 'system' };

// ========== DB ==========
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
        console.error('❌ DB error:', err.message);
        process.exit(1);
    }
    console.log('✅ DB connectée');
});

// ========== WEBSOCKET PUR ==========
wss.on('connection', (ws) => {
    console.log('✅ Client WS connecté');

    // envoyer état actuel
    ws.send(JSON.stringify({
        type: 'state',
        data: currentState
    }));

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);

            if (msg.type === 'toggle') {
                currentState = {
                    locked: msg.locked,
                    source: msg.source || 'unknown'
                };

                // broadcast à tous
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'state',
                            data: currentState
                        }));
                    }
                });
            }

        } catch (e) {
            console.log('❌ JSON error');
        }
    });

    ws.on('close', () => {
        console.log('❌ Client déconnecté');
    });
});

// ========== API ==========
app.get('/api/state', (req, res) => {
    res.json(currentState);
});

app.post('/api/verify', (req, res) => {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
        return res.status(400).json({ success: false });
    }

    db.query('SELECT name FROM users WHERE pin = ?', [pin], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false });
        }

        if (results.length > 0) {
            currentState = { locked: false, source: 'api' };

            // broadcast unlock
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'state',
                        data: currentState
                    }));
                }
            });

            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

server.listen(PORT, () => {
    console.log(`🚀 Server ${PORT}`);
});