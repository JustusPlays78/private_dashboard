import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import notesRouter from './routes/notes';
import tasksRouter from './routes/tasks';
import scriptsRouter from './routes/scripts';

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${req.method} ${req.path}`);

    const originalEnd = res.end;

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });

    next();
});

app.use((error: any, req: any, res: any, next: any) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Erhöht für größere Scripts

app.use('/api/notes', notesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/scripts', scriptsRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const startServer = async () => {
    try {
        await initDatabase();
        console.log('Database initialized successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
};

startServer();