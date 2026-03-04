import Pusher from 'pusher';

let pusherInstance = null;

const getPusher = () => {
    if (pusherInstance) return pusherInstance;

    const isConfigured =
        process.env.PUSHER_APP_ID &&
        process.env.PUSHER_KEY &&
        process.env.PUSHER_SECRET &&
        process.env.PUSHER_CLUSTER;

    if (isConfigured) {
        pusherInstance = new Pusher({
            appId: process.env.PUSHER_APP_ID,
            key: process.env.PUSHER_KEY,
            secret: process.env.PUSHER_SECRET,
            cluster: process.env.PUSHER_CLUSTER,
            useTLS: true,
        });
        return pusherInstance;
    }
    return null;
};

const pusher = {
    trigger: async (channel, event, data) => {
        const instance = getPusher();
        if (instance) {
            return instance.trigger(channel, event, data);
        } else {
            console.warn('[PUSHER] Not configured');
            return Promise.resolve();
        }
    }
};

export default pusher;
