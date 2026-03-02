/**
 * Global Media Manager
 * Single source of truth for all active camera/mic streams.
 * Call `registerStream(stream)` when you get a stream.
 * Call `killAll()` to stop every track on every registered stream.
 */

const streams = new Set();

export const mediaManager = {
    /**
     * Register a stream so it can be globally killed.
     */
    registerStream(stream) {
        if (stream) streams.add(stream);
    },

    /**
     * Immediately stop ALL tracks on ALL registered streams.
     * This turns off the camera/mic indicator light on the device.
     */
    killAll() {
        streams.forEach(stream => {
            stream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
        });
        streams.clear();
    },

    /**
     * Unregister a specific stream (e.g. when a component unmounts cleanly).
     */
    unregister(stream) {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streams.delete(stream);
        }
    },

    /**
     * Returns true if any stream currently has an active video track.
     */
    isCameraActive() {
        for (const stream of streams) {
            for (const track of stream.getVideoTracks()) {
                if (track.readyState === 'live') return true;
            }
        }
        return false;
    }
};
