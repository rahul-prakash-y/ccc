require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const mongoose = require('mongoose');
const fastifyStatic = require("@fastify/static");
const path = require("path");

// ─── Application Background Services ─────────────────────────────────────────
const { hydrateStaticData } = require('./services/cacheService');
const { hydrateRankingCache } = require('./utils/eligibility');
const { startSubmissionQueue, flushNow } = require('./services/submissionQueue');
const { startLeaderboardCache } = require('./services/leaderboardCache');

// ─── Static Files & SPA Fallback ─────────────────────────────────────────────
fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../frontend/dist"),
    prefix: "/",
});

fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url.startsWith('/api')) {
        return reply.code(404).send({ success: false, message: 'API route not found' });
    }
    return reply.sendFile('index.html');
});

// ─── Middlewares ─────────────────────────────────────────────────────────────
fastify.register(require('@fastify/cors'), {
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
});

fastify.register(require('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 }
});

fastify.register(require('./plugins/auth'));

// ─── Routes ──────────────────────────────────────────────────────────────────
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/rounds'), { prefix: '/api/rounds' });
fastify.register(require('./routes/admin'), { prefix: '/api/admin' });
fastify.register(require('./routes/superadmin'), { prefix: '/api/superadmin' });
fastify.register(require('./routes/attendance'), { prefix: '/api/attendance' });
fastify.register(require('./routes/student'), { prefix: '/api/student' });
fastify.register(require('./routes/internal'), { prefix: '/api/internal' });
fastify.register(require('./routes/database'), { prefix: '/api/database' });

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const closeServer = async (signal) => {
    fastify.log.info(`Received signal to terminate: ${signal}`);
    try {
        await fastify.close();
        await flushNow();
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(0);
    } catch (err) {
        console.error('SHUTDOWN ERROR:', err);
        process.exit(1);
    }
};

process.on('SIGINT', () => closeServer('SIGINT'));
process.on('SIGTERM', () => closeServer('SIGTERM'));

// ─── Server Boot ──────────────────────────────────────────────────────────────
const start = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/code_circuit_club';
        await mongoose.connect(mongoUri, {
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        });
        console.info('MongoDB Connected 🚀');

        // Pre-warm caches
        await Promise.all([
            hydrateStaticData(),
            hydrateRankingCache()
        ]);

        // Start background workers
        startLeaderboardCache();
        startSubmissionQueue();

        const port = process.env.PORT || 5000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.info(`Server listening on port ${port}`);

    } catch (err) {
        console.error('FATAL STARTUP ERROR:', err);
        process.exit(1);
    }
};

start();
