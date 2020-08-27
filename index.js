const WebSocket = require('ws');

const wsClient = new WebSocket('wss://ws-feed.pro.coinbase.com');

const messages_to_send = [];
const messages_to_receive = [];

wsClient.on('open', function open() {
    console.log(new Date() + ' connected');
    messages_to_send.forEach(m => wsClient.send(m));
    messages_to_send.length = 0;
});

const wss = new WebSocket.Server({port: 8099});

let count = 0;

let message_count = 0;

wss.on('connection', function connection(ws, req) {
    ws['client_id'] = count++;

    ws.on('message', function incoming(message) {
        console.log(new Date() + ' received %s: %s', ws['client_id'], message);
        if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(message);

            if (messages_to_receive.length > 0) {
                messages_to_receive.forEach(m => {
                    console.log(new Date() + ' replaying %s: %s', ws['client_id'], m);
                    ws.send(m);
                });
            }
        } else {
            messages_to_send.push(message);
        }
    });
    ws.on('ping', function ping(message) {
        console.log(new Date() + ' client ping: %s, %s', ws['client_id'], message);
        wsClient.ping(message);
    });
    ws.on('pong', function pong(message) {
        console.log(new Date() + ' client pong: %s, %s', ws['client_id'], message);
        wsClient.pong(message);
    });
    ws.on('close', function close() {
        console.log(new Date() + ' closed: %s', ws['client_id']);
    });

    console.log(new Date() + ' subscriber connected %s', ws['client_id']);

    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log(new Date() + ' sending re-connect: %s', ws['client_id']);
            ws.send('Please re-connect');
        }
    }, 12000);

    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log(new Date() + ' closing client: %s', ws['client_id']);
            ws.close();
        }
    }, 120000);
});

wsClient.on('message', function incoming(data) {
    message_count++;
    wss.clients.forEach(function each(client) {
        if (messages_to_receive.length < 20) {
            messages_to_receive.push(data);
        }
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
});

setInterval(() => {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            console.log(new Date() + ' sending application ping (timed) %s', client['client_id']);
            client.send('{"type":"ping"}');
        }
    });
}, 60000);
setInterval(() => {
    console.log(new Date() + ' messages received in 60 seconds %s', message_count);
    message_count = 0;
}, 60000);

setInterval(() => {
    if (messages_to_receive.length > 0) {
        messages_to_receive.forEach(m => console.log(new Date() + ' cache: %s', m));
    }
}, 60000);

setInterval(() => {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            console.log(new Date() + ' sending protocol ping (timed) %s', client['client_id']);
            client.ping();
        }
    });
}, 60000);

wsClient.on('ping', (data) => wss.clients.forEach(function each(client) {
    console.log(new Date() + ' received server ping - proxying to: %s, %s', client['client_id'], data);
    if (client.readyState === WebSocket.OPEN) {
        client.ping(data);
    } else {
        console.log(new Date() + ' received server ping - client not open %s', client['client_id']);
    }
}));
wsClient.on('pong', (data) => wss.clients.forEach(function each(client) {
    console.log(new Date() + ' received server pong - proxying to: %s, %s', client['client_id'], data);
    if (client.readyState === WebSocket.OPEN) {
        client.pong(data);
    } else {
        console.log(new Date() + ' received server pong - client not open %s', client['client_id']);
    }
}));

console.log(new Date() + ' ready');
