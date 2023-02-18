var canvas = document.getElementById("game");
var context = canvas.getContext("2d");
const socket = new WebSocket("ws://localhost:8080/");

socket.onopen = function () {
    if (localStorage.getItem('username')) {
        socket.send(JSON.stringify({ type: 'player-leave', authentication: { username: localStorage.getItem('username'), id: localStorage.getItem('id') } }));
        localStorage.clear();
    }

    socket.send(JSON.stringify({ type: 'player-join' }));
};

function renderGame(state) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (player in state) {
        const playerState = state[player]
        context.fillStyle = '#000000';
        context.globalAlpha = 0.1;
        context.fillRect(playerState.x, playerState.y, 1, 1);
    }
};

socket.onmessage = function (event) {
    event = JSON.parse(event.data);

    if (event.type === 'game-load') {
        const getCanvas = document.getElementById("game");
        getCanvas.style.width = event.settings.canvas_preview.width;
        getCanvas.style.height = event.settings.canvas_preview.width;
        getCanvas.width = event.settings.canvas.width;
        getCanvas.height = event.settings.canvas.height;
    };

    if (event.type === 'player-join') {
        localStorage.setItem('username', event.username);
        localStorage.setItem('id', event.id);
    }

    if (event.type === 'gameState') renderGame(event.state);
};

socket.onclose = function(event) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("mensagem").innerHTML = "Voce foi desconectado do servidor."
};


function keyboardListener() {
    document.addEventListener('keydown', (event) => {
        socket.send(JSON.stringify({ type: 'key-down', key: event.key.toLowerCase(), authentication: { username: localStorage.getItem('username'), id: localStorage.getItem('id') } }))
    });
};
keyboardListener();