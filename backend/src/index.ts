import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './database';
import notesRouter from './routes/notes';
import tasksRouter from './routes/tasks';
import scriptsRouter from './routes/scripts';
import secretsRouter from './routes/secrets';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Dein Request Logging
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${req.method} ${req.path}`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });

    next();
});

// CORS nur in Development
if (!isProduction) {
    app.use(cors());
    console.log('CORS enabled for development');
} else {
    console.log('CORS disabled for production');
}

app.use(express.json({ limit: '10mb' })); // Erhöht für größere Scripts

// API Routes
app.use('/api/notes', notesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/scripts', scriptsRouter);
app.use('/api/secrets', secretsRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        mode: isProduction ? 'production' : 'development'
    });
});

// Serve static frontend files in production
if (isProduction) {
    const frontendPath = path.join(__dirname, '../../frontend/dist');

    console.log(`Serving static files from: ${frontendPath}`);

    // Serve static files (CSS, JS, images, etc.)
    app.use(express.static(frontendPath, {
        maxAge: '1d', // Cache static assets for 1 day
        etag: true
    }));

    // Handle React Router - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            console.log(`API route not found: ${req.path}`);
            res.status(404).json({ error: `API route not found: ${req.path}` });
        } else {
            console.log(`Serving React app for route: ${req.path}`);
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    });
} else {
    // Development - show info message for non-API routes
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            console.log(`API route not found: ${req.path}`);
            res.status(404).json({ error: `API route not found: ${req.path}` });
        } else {
            res.json({
                message: 'Development mode - Frontend runs on separate port',
                frontend: 'http://localhost:3000',
                backend: `http://localhost:${PORT}`,
                api: `http://localhost:${PORT}/api`
            });
        }
    });
}

// Error handling middleware (dein Original)
app.use((error: any, req: any, res: any, next: any) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
    try {
        await initDatabase();
        console.log('Database initialized successfully');

        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

            if (isProduction) {
                console.log(`🌐 Application available at: http://localhost:${PORT}`);
                console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
            } else {
                console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
                console.log(`⚛️  Frontend: http://localhost:3000 (separate process)`);
                console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
            }
            console.log('');
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
};

startServer();