// backend/server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration pour TiDB Cloud avec SSL/TLS
const db = mysql.createConnection({
    host: process.env.DB_HOST ,
    port: process.env.DB_PORT ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

// Connecter à TiDB
db.connect((err) => {
    if (err) {
        console.error('❌ Erreur de connexion TiDB:', err.message);
        console.log('💡 Vérifiez vos variables d\'environnement');
        process.exit(1);
    }
    console.log('✅ Connecté à TiDB Cloud');
});

// ============ ENDPOINTS ANTI-SOMMEIL ============

// Endpoint racine (pour éviter 404)
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'Smart Lock API is running',
        endpoints: {
            health: 'GET /health',
            verify: 'POST /api/verify',
            keepAlive: 'GET /ping'
        },
        timestamp: new Date().toISOString()
    });
});

// Endpoint simple pour ping (anti-sommeil)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Health check complet
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        database: 'TiDB Cloud',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ============ ENDPOINTS PRINCIPAUX ============

// Vérification du PIN
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

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   GET  /        - Informations API`);
    console.log(`   GET  /ping    - Anti-sommeil`);
    console.log(`   GET  /health  - Health check`);
    console.log(`   POST /api/verify - Vérification PIN`);
});