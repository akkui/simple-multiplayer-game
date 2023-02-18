const http = require('http');
const ws = require('ws');
const wss = new ws.Server({ noServer: true });

let game = {
    authentication: {},
    clients: new Set(),
    players: {},
    settings: {
        canvas: {
            width: 20,
            height: 20
        },
        canvas_preview: {
            width: 800,
            height: 800
        }
    }
}

function updateGameStatus() {
    for (client of game.clients) {
        client.send(JSON.stringify({ type: 'gameState', state: game.players }));
    }
}

function removePlayer(username) {
    delete game.authentication[username];
    delete game.players[username];
    updateGameStatus();
}

function afkDetector(client, username) {
    setTimeout(() => {
        if (game.players[username]) {
            if (game.players[username].afk === true) {
                removePlayer(username);
                client.close(1000, "AFK")
            } else {
                game.players[username].afk = true;
                afkDetector(client, username);
            }
        }
    }, 15000);
}

function onConnect(ws) {
    ws.on('message', function (data) {
        data = JSON.parse(data.toString());

        if (data.type === 'player-join') {
            function generateId() {
                value = Buffer.from(`${Math.floor((Math.random() * 999999) + 1)}`).toString('base64');
                if (game.authentication[value]) {
                    generateId();
                } else {
                    return value;
                }
            }

            const user_id = generateId();
            const user_name = generateId();

            game.clients.add(ws);
            game.authentication[user_name] = { id: user_id }
            game.players[user_name] = {
                afk: true,
                x: Math.floor((Math.random() * game.settings.canvas.height)),
                y: Math.floor((Math.random() * game.settings.canvas.width))
            }

            ws.send(JSON.stringify({ type: 'player-join', username: user_name, id: user_id }));
            ws.send(JSON.stringify({ type: 'game-load', settings: game.settings }));
            updateGameStatus();
            afkDetector(ws, user_name);
        }

        if (data.type === 'player-leave') {
            if (game.authentication[data.authentication.username] && game.authentication[data.authentication.username].id === data.authentication.id) {
                removePlayer(data.authentication.username);
            }
        }

        if (data.type === 'key-down') {
            if (game.authentication[data.authentication.username] && game.authentication[data.authentication.username].id === data.authentication.id) {
                const player = game.players[data.authentication.username];
                const keys = {
                    'w': () => {
                        if (player.y === 0) return;
                        player.y = player.y - 1;
                    },
                    'a': () => {
                        if (player.x === 0) return;
                        player.x = player.x - 1;
                    },
                    's': () => {
                        if (player.y === (game.settings.canvas.width - 1)) return;
                        player.y = player.y + 1;
                    },
                    'd': () => {
                        if (player.x === (game.settings.canvas.height - 1)) return;
                        player.x = player.x + 1
                    },
                }
    
                if (keys[data.key]) {
                    player.afk = false;
                    keys[data.key]();
                    updateGameStatus();
                };
            };
        }
    });
}

function accept(req, res) {
    if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() != 'websocket') { res.end(); return; }
    if (!req.headers.connection.match(/\bupgrade\b/i)) { res.end(); return; }
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onConnect);
}

if (!module.parent) {
    http.createServer(accept).listen(8080);
} else {
    exports.accept = accept;
}