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
                messages_to_receive.forEach(m => ws.send(m));
            }
        } else {
            messages_to_send.push(message);
        }
    });
    ws.on('ping', function ping() {
        console.log(new Date() + ' client ping: %s', ws['client_id']);
        wsClient.ping();
    });
    ws.on('pong', function pong() {
        console.log(new Date() + ' client pong: %s', ws['client_id']);
        wsClient.pong();
    });
    ws.on('close', function close() {
        console.log(new Date() + ' closed: %s', ws['client_id']);
    });

    console.log(new Date() + ' subscriber connected %s', ws['client_id']);

    setTimeout(() => {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                console.log(new Date() + ' closing client: %s', client['client_id']);
                client.close();
            }
        });
        console.log(new Date() + ' subscribers closed');
    }, 120000);
});

wsClient.on('message', function incoming(data) {
    message_count++;
    wss.clients.forEach(function each(client) {
        if (messages_to_receive.length < 2) {
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

wsClient.on('ping', () => wss.clients.forEach(function each(client) {
    console.log(new Date() + ' received server ping - proxying it %s', client['client_id']);
    if (client.readyState === WebSocket.OPEN) {
        client.ping();
    } else {
        console.log(new Date() + ' received server ping - client not open %s', client['client_id']);
    }
}));
wsClient.on('pong', () => wss.clients.forEach(function each(client) {
    console.log(new Date() + ' received server pong - proxying it %s', client['client_id']);
    if (client.readyState === WebSocket.OPEN) {
        client.pong();
    } else {
        console.log(new Date() + ' received server pong - client not open %s', client['client_id']);
    }
}));

console.log(new Date() + ' ready');
