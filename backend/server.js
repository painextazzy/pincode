// backend/server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();  // Important: charger .env

const app = express();

// Utiliser les variables d'environnement
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration MySQL avec variables d'environnement
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connecter à MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Erreur de connexion MySQL:', err.message);
        console.log('💡 Vérifiez votre fichier .env');
        process.exit(1);
    }
    console.log('✅ Connecté à MySQL sur', process.env.DB_HOST);
});

// Endpoint de vérification
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
                message: ' Accès autorisé',
                user: results[0].name
            });
        } else {
            res.json({
                success: false,
                message: ' Code incorrect'
            });
        }
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    
    console.log(`📡 Endpoint: POST /api/verify`);
    console.log(`📊 Base de données: ${process.env.DB_NAME}`);
});