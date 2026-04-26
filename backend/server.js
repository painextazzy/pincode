const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== BASE DE DONNÉES ==========
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erreur de connexion:', err.message);
        process.exit(1);
    }
    console.log('✅ Connecté à TiDB');
});

// ========== ÉTAT EN MÉMOIRE ==========
let currentLockState = {
    locked: true,
    lastUpdated: new Date().toISOString(),
    source: 'system'
};

// ========== ENDPOINTS ==========

// Récupérer l'état (pour Wokwi et frontend)
app.get('/api/state', (req, res) => {
    res.json(currentLockState);
});

// Changer l'état (verrouiller/déverrouiller)
app.post('/api/toggle', (req, res) => {
    const { locked, source } = req.body;
    
    currentLockState = {
        locked: locked,
        lastUpdated: new Date().toISOString(),
        source: source || 'api'
    };
    
    console.log(`🔐 ${locked ? 'VERROUILLÉ' : 'DÉVERROUILLÉ'} depuis ${source}`);
    res.json({ success: true, state: currentLockState });
});

// Vérifier le PIN
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
            // Déverrouiller
            currentLockState = {
                locked: false,
                lastUpdated: new Date().toISOString(),
                source: 'api'
            };
            
            // Auto-verrouillage après 5 secondes
            setTimeout(() => {
                currentLockState = {
                    locked: true,
                    lastUpdated: new Date().toISOString(),
                    source: 'auto'
                };
                console.log('🔒 Auto-verrouillage');
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Endpoints: /api/state, /api/verify, /api/toggle, /health`);
});