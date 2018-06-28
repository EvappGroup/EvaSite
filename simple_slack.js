import fetch, {
       Response } from 'node-fetch';
import qs         from 'querystring';
import WebSocket  from 'ws';

class SimpleSlack {
  
  baseURL        = 'https://slack.com/api/';
  eventListeners = {};
  connection     = null;
  socketMsgId    = 0;
  
  constructor(opts = {}) {
    if (typeof opts === 'string') {
      this.defaults = { token: opts };
    } else {
      this.defaults = opts;
    }
  }
  
  send(opts = {}) {
    let id = opts.id || this.socketMsgId++;
    this.ws.send(JSON.stringify({ ...opts, id }));
    return id;
  }
  
  async on(event, callback, opts = {}) {
    let cbID = callback.toString();
    this.eventListeners[cbID] = async data => callback(await this.parseJSON(data));
    if (this.ws == null || this.connection == null) {
      await this.connect(opts);
      this.on(event, callback, opts);
    } else {
      this.ws.on(event, this.eventListeners[cbID]);
      return this.connection;
    }
  }
  
  off(event, callback) {
    if (this.ws == null) return;
    let cbID = callback.toString();
    this.ws.removeListener(event, this.eventListeners[cbID]);
    delete this.eventListeners[cbID];
  }
  
  async parseJSON(str) {
    return (
      await new Response(str).json()  
    );
  }
  
  async connect(opts = {}) {
    let connection = await this.method('rtm.start', opts);
    if (connection.ok) {
      this.ws = new WebSocket(connection.url);
      this.connection = connection;
    }
    return connection;
  }
  
  async method(method, opts = {}) {
    opts = { ...this.defaults, ...opts };
    for (let option of Object.keys(opts)) {
      if (typeof opts[option] === 'array') {
        // synchronous for now
        opts[option] = JSON.stringify(opts[option]);
      }
    }
    return (
      await this.api(`${this.baseURL + method}?${qs.stringify(opts)}`)
    );
  }
  
  async submit(opts = {}) {
    opts = { ...this.defaults, ...opts };
    let webhook = opts.webhook;
    delete opts.webhook;
    return (
      await this.api(webhook, {
        method: 'post',
        body: JSON.stringify(opts)
      })
    );
  }
  
  async api(endpoint, opts) {
    let response = await fetch(endpoint, opts || null);
    return (
      await response.json()
    );
  }
  
}
