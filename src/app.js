import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import db from './db.js';
import authRoutes from './routes/auth.js';
import accountsRoutes from './routes/accounts.js';
import transactionsRoutes from './routes/transactions.js';
import invoicesRoutes from './routes/invoices.js';
import taxRoutes from './routes/tax.js';
import './models/associations.js';

const app = express();
app.use(express.json());

// Serve API docs as HTML at /docs with basic CSS for spacing
app.get('/docs', (req, res) => {
    const docsPath = path.join(process.cwd(), 'API_DOCS.md');
    fs.readFile(docsPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Docs not found');
        const html = marked.parse(data);
        const style = `
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; color: #222; margin: 0; padding: 0; }
            .container { max-width: 900px; margin: 40px auto; background: #fff; padding: 40px 32px; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
            h1, h2, h3 { margin-top: 2em; margin-bottom: 1em; }
            table { width: 100%; border-collapse: collapse; margin: 32px 0; }
            th, td { padding: 14px 18px; border: 1px solid #e0e0e0; text-align: left; }
            th { background: #f3f3f3; font-weight: 600; }
            tr:nth-child(even) { background: #fafafa; }
            code, pre { background: #f4f4f4; border-radius: 4px; padding: 2px 6px; }
            pre { padding: 12px; }
            @media (max-width: 600px) { .container { padding: 10px; } th, td { padding: 8px; } }
        `;
        res.send(`<!DOCTYPE html><html><head><title>API Docs</title><style>${style}</style></head><body><div class="container">${html}</div></body></html>`);
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/tax', taxRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
const skipDbSync = process.env.SKIP_DB_SYNC === 'true';

if (skipDbSync) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (skip DB sync)`);
    });
} else {
    db.sync().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }).catch(err => {
        console.error('DB sync failed:', err);
        process.exit(1);
    });
}