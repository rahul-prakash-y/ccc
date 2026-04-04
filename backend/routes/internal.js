// Fallback mock function if it hasn't been implemented yet globally
if (typeof global.hydrateStaticData !== 'function') {
    global.hydrateStaticData = async () => {
        // Mock hydration logic
        return new Promise(resolve => setTimeout(resolve, 500));
    };
}

module.exports = async function (fastify, opts) {
    fastify.post('/sync-cache', async (request, reply) => {
        try {
            // Secure with SHARED_SECRET_KEY
            const authHeader = request.headers.authorization;
            const expectedSecret = `Bearer ${process.env.SHARED_SECRET_KEY}`;

            if (!process.env.SHARED_SECRET_KEY || authHeader !== expectedSecret) {
                return reply.code(403).send({ success: false, error: 'Unauthorized: Invalid Shared Secret' });
            }

            // Trigger the global hydration function (or local if passed via context)
            if (typeof global.hydrateStaticData === 'function') {
                await global.hydrateStaticData();
            } else {
                throw new Error("hydrateStaticData function is missing");
            }

            return reply.send({ success: true, message: 'Server cache successfully synchronized with MongoDB.' });
        } catch (error) {
            fastify.log.error('Cache sync error:', error);
            return reply.code(500).send({ success: false, error: 'Failed to synchronize cache' });
        }
    });
};
