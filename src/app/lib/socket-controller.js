import noop from 'lodash/noop';
import io from 'socket.io-client';

class SocketController {
    socket = null;

    token = '';

    callbacks = {};

    get connected() {
        return !!(this.socket && this.socket.connected);
    }

    connect(token, next = noop) {
        if (typeof next !== 'function') {
            next = noop;
        }

        if (this.token !== '' && this.token === token && this.socket) {
            return;
        }

        this.socket && this.socket.destroy();

        this.socket = io.connect('', {
            query: `token=${token}`,
        });

        this.socket.on('startup', () => {
            if (next) {
                next();
                next = null;
            }
        });
    }

    disconnect() {
        this.socket && this.socket.destroy();
        this.socket = null;
    }

    emit(event, ...args) {
        setTimeout(() => {
            this.socket && this.socket.emit(event, ...args);
        }, 200);
    }

    on(eventName, callback) {
        if (!this.callbacks[eventName]) {
            this.callbacks[eventName] = [];
        }
        const callbacks = this.callbacks[eventName];
        if (callbacks) {
            callbacks.push(callback);
        }
        this.socket.on(eventName, (...args) => {
            for (const callback1 of callbacks) {
                callback1(...args);
            }
        });
    }

    once(eventName, callback) {
        this.socket.once(eventName, (...args) => {
            callback(...args);
        });

        return this;
    }
}

const socketController = new SocketController();

export default socketController;
