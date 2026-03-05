import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            // Check for bot_token for bots if needed
            const botToken = req.query.bot_token;
            if (botToken) {
                req.auth = { userId: `bot-${botToken}` };
                return next();
            }
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.auth = { userId: decoded.userId };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

export default authMiddleware;
