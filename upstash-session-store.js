const session = require('express-session');

class UpstashSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.client = options.client;
    this.prefix = options.prefix || 'sess:';
    this.ttl = options.ttl || 86400; // Default: 24 hours
    this.disableTouch = options.disableTouch || false;
    this.serializer = options.serializer || JSON;

  }

  // Get session
  async get(sid, callback) {
    try {
      const key = this.prefix + sid;
      const data = await this.client.get(key);
      
      if (!data) {
        return callback(null, null);
      }

      let result;
      if (typeof data === 'string') {
        try {
          result = this.serializer.parse(data);
        } catch (err) {
          return callback(err);
        }
      } else {
        result = data;
      }

      return callback(null, result);
    } catch (err) {
      return callback(err);
    }
  }

  // Set session
  async set(sid, session, callback) {
    try {
      const key = this.prefix + sid;
      const ttl = this._getTTL(session);
      const data = this.serializer.stringify(session);

      await this.client.set(key, data, { EX: ttl });
      
      return callback ? callback(null) : null;
    } catch (err) {
      return callback ? callback(err) : null;
    }
  }

  // Destroy session
  async destroy(sid, callback) {
    try {
      const key = this.prefix + sid;
      await this.client.del(key);
      return callback ? callback(null) : null;
    } catch (err) {
      return callback ? callback(err) : null;
    }
  }

  // Touch session (update expiry)
  async touch(sid, session, callback) {
    if (this.disableTouch) {
      return callback ? callback(null) : null;
    }

    try {
      const key = this.prefix + sid;
      const ttl = this._getTTL(session);
      
      // For REST connections, get and re-set with new TTL
      const data = await this.client.get(key);
      if (data) {
        await this.client.set(key, data, { EX: ttl });
      }
      
      return callback ? callback(null) : null;
    } catch (err) {
      return callback ? callback(err) : null;
    }
  }

  // Get all sessions (optional)
  async all(callback) {
    // Note: This is expensive with Upstash and should be avoided in production
    console.warn('UpstashSessionStore: all() method is not recommended for production use');
    return callback ? callback(null, []) : null;
  }

  // Clear all sessions (optional)
  async clear(callback) {
    // Note: This would require scanning all keys which is expensive with Upstash
    console.warn('UpstashSessionStore: clear() method is not implemented');
    return callback ? callback(null) : null;
  }

  // Get TTL
  _getTTL(session) {
    if (session && session.cookie && session.cookie.maxAge) {
      return Math.floor(session.cookie.maxAge / 1000);
    }
    return this.ttl;
  }
}

module.exports = UpstashSessionStore;