const container = document.getElementById('circles-container');
let circles = [];
let players = [
    { id: 1, element: document.getElementById('player1'), name: 'Игрок 1' },
    { id: 2, element: document.getElementById('player2'), name: 'Игрок 2' },
    { id: 3, element: document.getElementById('player3'), name: 'Игрок 3' }
];
let playerPositions = [0, 0, 0];
let currentPlayerTurn = 0;

// База вопросов
let questionsDB = { blitz: [], question: [], duel: [] };
// Индексы использованных вопросов (чтобы не повторяться)
let usedQuestions = { blitz: [], question: [], duel: [] };

// Загружаем вопросы из questions.json
fetch('src/questions.json')
    .then(r => r.json())
    .then(data => { questionsDB = data; })
    .catch(() => console.warn('questions.json не найден, вопросы недоступны'));

// Получить случайный вопрос из категории (без повторов)
function getRandomQuestion(category) {
    const pool = questionsDB[category];
    if (!pool || pool.length === 0) return null;
    if (usedQuestions[category].length >= pool.length) {
        usedQuestions[category] = []; // сбрасываем когда все использованы
    }
    const available = pool.filter(q => !usedQuestions[category].includes(q.id));
    const q = available[Math.floor(Math.random() * available.length)];
    usedQuestions[category].push(q.id);
    return q;
}

// --- Кубик ---
let diceResolve = null;

function rollDice() {
    const modal = document.getElementById('diceModal');
    const display = document.getElementById('diceDisplay');
    const result = document.getElementById('diceResult');
    const confirmBtn = document.getElementById('diceConfirmBtn');

    result.textContent = '';
    confirmBtn.style.display = 'none';
    modal.style.display = 'flex';

    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    let ticks = 0;
    const maxTicks = 20;
    const interval = setInterval(() => {
        const r = Math.floor(Math.random() * 6);
        display.querySelector('#dice1').textContent = faces[r];
        ticks++;
        if (ticks >= maxTicks) {
            clearInterval(interval);
            const finalVal = Math.floor(Math.random() * 6) + 1;
            display.querySelector('#dice1').textContent = faces[finalVal - 1];
            result.textContent = `Выпало: ${finalVal}`;
            confirmBtn.style.display = 'inline-block';
            confirmBtn.dataset.value = finalVal;
        }
    }, 60);
}

function confirmDiceRoll() {
    const val = parseInt(document.getElementById('diceConfirmBtn').dataset.value);
    document.getElementById('stepsInput').value = val;
    closeDiceModal();
}

function closeDiceModal() {
    document.getElementById('diceModal').style.display = 'none';
}

// --- Вопросы ---
let questionResolve = null;

function showQuestion(category) {
    return new Promise(resolve => {
        questionResolve = resolve;
        const q = getRandomQuestion(category);
        const modal = document.getElementById('questionModal');
        const badge = document.getElementById('questionType');
        const text = document.getElementById('questionText');
        const rules = document.getElementById('questionRules');

        const config = {
            blitz:    { label: 'БЛИЦ',   color: '#e67e22', rule: 'Правильный ответ хотя бы на один вопрос → +1 клетка вперёд' },
            question: { label: 'ВОПРОС', color: '#2980b9', rule: 'Правильный ответ → +2 клетки, неправильный → −1 клетка' },
            duel:     { label: 'ДУЭЛЬ',  color: '#c0392b', rule: 'Выберите противника. Кто ответит правильно — идёт вперёд на 2' }
        };

        const cfg = config[category];
        badge.textContent = cfg.label;
        badge.style.background = cfg.color;
        rules.textContent = cfg.rule;
        text.textContent = q ? q.question : '(Вопросы не загружены — добавьте их в questions.json)';

        modal.style.display = 'flex';
    });
}

function answerQuestion(correct) {
    document.getElementById('questionModal').style.display = 'none';
    if (questionResolve) {
        questionResolve(correct);
        questionResolve = null;
    }
}

const specialMoves = {
    5: 0,
    8: 12,
    13: 20,
    15: 11,
    19: 49,
    21: 67,
    23: 6,
    31: 3,
    34: 59,
    39: 35,
    48: 18,
    60: 62,
    63: 55,
    65: 26,
    71: 51,
    76: 17,
    78: 47,
    84: 87,
    89: 64
};

// переменные для хранения состояния настроек
let settings = {
    enableDuels: true,
    enableQuestions: true,
    enableBlitz: true,
    moveSpeed: "500",
    blitzCells: [14, 22, 30, 38, 64, 70, 75, 88],
    questionCells: [50, 53, 80, 86],
    duelCells: [29, 42, 25, 46]
};

// объект с значениями по умолчанию
const defaultSettings = {
    blitzCells: [14, 22, 30, 38, 64, 70, 75, 88],
    questionCells: [50, 53, 80, 86],
    duelCells: [29, 42, 25, 46],
    moveSpeed: "500"
};

// Функция для сохранения состояния игры
function saveGameState() {
    const gameState = {
        playerPositions,
        currentPlayerTurn,
        players: players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score || 0
        }))
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// Функция для загрузки состояния игры
function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);

        // Восстанавливаем игроков
        if (gameState.players) {
            players.forEach(p => p.element.remove());
            players = gameState.players.map(p => {
                const playerDiv = document.createElement('div');
                playerDiv.className = `player player${p.id}`;
                return {
                    id: p.id,
                    name: p.name,
                    score: p.score || 0,
                    element: playerDiv
                };
            });
        }

        playerPositions = gameState.playerPositions;
        currentPlayerTurn = gameState.currentPlayerTurn;

        // Восстанавливаем позиции игроков
        players.forEach((player, index) => {
            if (circles[playerPositions[index]]) {
                positionPlayerNearCircle(circles[playerPositions[index]], player.element, index);
            }
        });

        // Обновляем отображение текущего игрока
        updateCurrentPlayerDisplay();
    }
}

function createPath() {
    const circleSize = 50;
    const containerWidth = 1920;

    container.innerHTML = '';
    circles = [];


    const savedPositions = [...playerPositions];
    const savedTurn = currentPlayerTurn;


    players.forEach(player => container.appendChild(player.element));


    const pathCoordinates = [

        { x: 30, y: 1180 },

        { x: 120, y: 1195 },
        { x: 240, y: 1195 },
        { x: 360, y: 1195 },
        { x: 480, y: 1195 },
        { x: 600, y: 1195 },
        { x: 720, y: 1195 },
        { x: 840, y: 1195 },
        { x: 940, y: 1200 },
        { x: 1080, y: 1195 },
        { x: 1200, y: 1195 },
        { x: 1320, y: 1195 },
        { x: 1440, y: 1195 },
        { x: 1560, y: 1195 },
        { x: 1680, y: 1195 },
        { x: 1800, y: 1195 },

        { x: 1800, y: 1090 },
        { x: 1790, y: 980 },
        { x: 1670, y: 980 },
        { x: 1550, y: 1010 },
        { x: 1320, y: 980 },
        { x: 1200, y: 980 },
        { x: 1080, y: 980 },
        { x: 960, y: 980 },
        { x: 840, y: 980 },
        { x: 720, y: 980 },
        { x: 590, y: 1000 },
        { x: 480, y: 980 },
        { x: 340, y: 980 },
        { x: 125, y: 980 },
        { x: 125, y: 880 },

        { x: 135, y: 785 },
        { x: 250, y: 770 },
        { x: 350, y: 770 },
        { x: 480, y: 770 },
        { x: 600, y: 770 },
        { x: 720, y: 770 },
        { x: 840, y: 770 },
        { x: 960, y: 770 },
        { x: 1080, y: 770 },
        { x: 1210, y: 780 },
        { x: 1330, y: 780 },
        { x: 1440, y: 770 },
        { x: 1560, y: 770 },
        { x: 1680, y: 770 },
        { x: 1800, y: 770 },

        { x: 1790, y: 670 },
        { x: 1780, y: 570 },
        { x: 1660, y: 570 },
        { x: 1540, y: 570 },
        { x: 1420, y: 570 },
        { x: 1300, y: 570 },
        { x: 1080, y: 570 },
        { x: 950, y: 570 },
        { x: 825, y: 570 },
        { x: 720, y: 570 },
        { x: 600, y: 570 },
        { x: 480, y: 570 },
        { x: 360, y: 570 },
        { x: 240, y: 570 },
        { x: 125, y: 570 },

        { x: 125, y: 370 },
        { x: 240, y: 370 },
        { x: 360, y: 370 },
        { x: 480, y: 370 },
        { x: 580, y: 330 },
        { x: 720, y: 370 },
        { x: 840, y: 370 },
        { x: 1080, y: 370 },
        { x: 1190, y: 370 },
        { x: 1300, y: 370 },
        { x: 1440, y: 370 },
        { x: 1560, y: 370 },
        { x: 1680, y: 370 },
        { x: 1790, y: 370 },
        { x: 1780, y: 250 },
        { x: 1800, y: 160 },
        { x: 1680, y: 160 },
        { x: 1550, y: 160 },
        { x: 1420, y: 160 },
        { x: 1290, y: 160 },
        { x: 1160, y: 160 },
        { x: 1050, y: 160 },
        { x: 930, y: 160 },
        { x: 820, y: 160 },
        { x: 695, y: 160 },
        { x: 590, y: 160 },
        { x: 470, y: 160 },
        { x: 350, y: 160 },
        { x: 260, y: 160 },
        { x: 140, y: 45 }
    ];

    let maxY = 0;

    pathCoordinates.forEach((coord, i) => {
        const circle = document.createElement('div');
        circle.className = 'circle';

        circle.style.left = `${coord.x}px`;
        circle.style.top = `${coord.y}px`;

        const hue = (i / pathCoordinates.length) * 360;
        circle.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;

        container.appendChild(circle);
        circles.push({
            element: circle,
            x: coord.x,
            y: coord.y
        });

        maxY = Math.max(maxY, coord.y);
    });

    container.style.height = `${maxY + circleSize * 3}px`;

    if (circles.length > 0) {
        const firstCircle = circles[0];
        players.forEach((player, index) => {
            positionPlayerNearCircle(firstCircle, player.element, index);
        });
    }

    // Восстанавливаем позиции и ход
    playerPositions = savedPositions;
    currentPlayerTurn = savedTurn;

    // Восстанавливаем позиции игроков
    players.forEach((player, index) => {
        if (circles[playerPositions[index]]) {
            positionPlayerNearCircle(circles[playerPositions[index]], player.element, index);
        }
    });

    // Обновляем отображение текущего игрока
    updateCurrentPlayerDisplay();
}

function positionPlayerNearCircle(circle, playerElement, playerIndex) {
    const radius = 40; // Радиус окружности, на которой располагаются игроки
    const totalPlayers = players.length; // Используем текущее количество игроков
    const circleSize = 40; // Размер круга

    // Вычисляем угол для каждого игрока
    const angleInDegrees = -90 + (360 / totalPlayers) * playerIndex;
    const angleInRadians = (angleInDegrees * Math.PI) / 180;

    // Вычисляем позицию на окружности, добавляя смещение на центр круга
    const x = circle.x + (circleSize / 2) + radius * Math.cos(angleInRadians);
    const y = circle.y + (circleSize / 2) + radius * Math.sin(angleInRadians);

    // Центрируем игрока относительно вычисленной позиции
    playerElement.style.left = `${x - 20}px`;
    playerElement.style.top = `${y - 20}px`;
}

function showModal(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('modal');
        const modalText = document.getElementById('modal-text');
        const modalOk = document.getElementById('modal-ok');
        const modalCancel = document.getElementById('modal-cancel');
        modalText.innerHTML = message;
        modal.style.display = 'flex';

        modalOk.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };

        modalCancel.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}

async function movePlayer() {
    const steps = parseInt(document.getElementById('stepsInput').value);
    if (isNaN(steps) || steps < 1) return;

    const currentPosition = playerPositions[currentPlayerTurn];
    let targetPosition = Math.min(currentPosition + steps, circles.length - 1);

    for (let i = currentPosition + 1; i <= targetPosition; i++) {
        const circle = circles[i];
        positionPlayerNearCircle(circle, players[currentPlayerTurn].element, currentPlayerTurn);
        await new Promise(resolve => setTimeout(resolve, settings.moveSpeed));
    }

    if (specialMoves.hasOwnProperty(targetPosition)) {
        const newPosition = specialMoves[targetPosition];

        const shouldMove = await showModal(`Вы попали на клетку ${targetPosition}! 
            Перемещаемся на клетку ${specialMoves[targetPosition]}`);

        if (shouldMove) {
            const finalCircle = circles[newPosition];
            positionPlayerNearCircle(finalCircle, players[currentPlayerTurn].element, currentPlayerTurn);
            playerPositions[currentPlayerTurn] = newPosition;
            targetPosition = newPosition;
        }
    }

    playerPositions[currentPlayerTurn] = targetPosition;
    players[currentPlayerTurn].score = targetPosition;
    updatePlayerListCorner();

    if (settings.enableBlitz && settings.blitzCells.includes(targetPosition)) {
        const correct = await showQuestion('blitz');
        if (correct === true) {
            targetPosition = Math.min(targetPosition + 1, circles.length - 1);
            positionPlayerNearCircle(circles[targetPosition], players[currentPlayerTurn].element, currentPlayerTurn);
            playerPositions[currentPlayerTurn] = targetPosition;
        }
    }

    if (settings.enableQuestions && settings.questionCells.includes(targetPosition)) {
        const correct = await showQuestion('question');
        if (correct === true) {
            targetPosition = Math.min(targetPosition + 2, circles.length - 1);
        } else if (correct === false) {
            targetPosition = Math.max(targetPosition - 1, 0);
        }
        positionPlayerNearCircle(circles[targetPosition], players[currentPlayerTurn].element, currentPlayerTurn);
        playerPositions[currentPlayerTurn] = targetPosition;
    }

    if (settings.enableDuels && settings.duelCells.includes(targetPosition)) {
        await showQuestion('duel');
    }

    players[currentPlayerTurn].score = playerPositions[currentPlayerTurn];
    await new Promise(resolve => setTimeout(resolve, 500));
    currentPlayerTurn = (currentPlayerTurn + 1) % players.length;
    updateCurrentPlayerDisplay();
    document.getElementById('stepsInput').value = '';
    updatePlayerListCorner();
    saveGameState();
}

async function movePlayerBackward() {
    const steps = parseInt(document.getElementById('stepsInput').value);
    if (isNaN(steps) || steps < 1) return;

    const currentPosition = playerPositions[currentPlayerTurn];
    let targetPosition = Math.max(currentPosition - steps, 0);

    for (let i = currentPosition - 1; i >= targetPosition; i--) {
        const circle = circles[i];
        positionPlayerNearCircle(circle, players[currentPlayerTurn].element, currentPlayerTurn);
        await new Promise(resolve => setTimeout(resolve, settings.moveSpeed));
    }

    if (specialMoves.hasOwnProperty(targetPosition)) {
        const newPosition = specialMoves[targetPosition];
        const shouldMove = await showModal(`Вы попали на клетку ${targetPosition}! Перемещаемся на клетку ${specialMoves[targetPosition]}`);
        if (shouldMove) {
            const finalCircle = circles[newPosition];
            positionPlayerNearCircle(finalCircle, players[currentPlayerTurn].element, currentPlayerTurn);
            playerPositions[currentPlayerTurn] = newPosition;
            targetPosition = newPosition;
        }
    }

    playerPositions[currentPlayerTurn] = targetPosition;

    if (settings.enableBlitz && settings.blitzCells.includes(targetPosition)) {
        const correct = await showQuestion('blitz');
        if (correct === true) {
            targetPosition = Math.min(targetPosition + 1, circles.length - 1);
            positionPlayerNearCircle(circles[targetPosition], players[currentPlayerTurn].element, currentPlayerTurn);
            playerPositions[currentPlayerTurn] = targetPosition;
        }
    }

    if (settings.enableQuestions && settings.questionCells.includes(targetPosition)) {
        const correct = await showQuestion('question');
        if (correct === true) {
            targetPosition = Math.min(targetPosition + 2, circles.length - 1);
        } else if (correct === false) {
            targetPosition = Math.max(targetPosition - 1, 0);
        }
        positionPlayerNearCircle(circles[targetPosition], players[currentPlayerTurn].element, currentPlayerTurn);
        playerPositions[currentPlayerTurn] = targetPosition;
    }

    if (settings.enableDuels && settings.duelCells.includes(targetPosition)) {
        await showQuestion('duel');
    }

    players[currentPlayerTurn].score = playerPositions[currentPlayerTurn];
    await new Promise(resolve => setTimeout(resolve, 500));
    currentPlayerTurn = (currentPlayerTurn + 1) % players.length;
    updateCurrentPlayerDisplay();
    document.getElementById('stepsInput').value = '';
    updatePlayerListCorner();
    saveGameState();
}

function updateCurrentPlayerDisplay() {
    const currentPlayer = players[currentPlayerTurn];
    document.getElementById('currentPlayer').textContent = currentPlayer ? currentPlayer.name : '';
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {

        const savedTurn = currentPlayerTurn;
        createPath();

        currentPlayerTurn = savedTurn;
        updateCurrentPlayerDisplay();
    }, 250);
});

window.addEventListener('load', () => {
    const savedState = localStorage.getItem('gameState');
    if (!savedState) {
        const baseState = {
            playerPositions: [0, 0, 0],
            currentPlayerTurn: 0,
            players: [
                { id: 1, name: 'Игрок 1', score: 0 },
                { id: 2, name: 'Игрок 2', score: 0 },
                { id: 3, name: 'Игрок 3', score: 0 }
            ]
        };
        localStorage.setItem('gameState', JSON.stringify(baseState));
    }

    const gameState = JSON.parse(localStorage.getItem('gameState'));

    players = gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score || 0,
        element: (() => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player player${p.id}`;
            return playerDiv;
        })()
    }));

    playerPositions = gameState.playerPositions;
    currentPlayerTurn = gameState.currentPlayerTurn;

    createPath();
    initializeTooltips();
    updatePlayerListCorner();

    loadSettings();
});

function resetGame() {
    if (!confirm('Вы уверены, что хотите начать новую игру?')) {
        return;
    }

    const gameState = {
        playerPositions: new Array(players.length).fill(0),
        currentPlayerTurn: 0,
        players: players.map(p => ({
            id: p.id,
            name: p.name,
            score: 0
        }))
    };

    localStorage.setItem('gameState', JSON.stringify(gameState));

    players.forEach(player => {
        if (player.element && player.element.parentNode) {
            player.element.remove();
        }
    });

    players = gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score || 0,
        element: (() => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player player${p.id}`;
            return playerDiv;
        })()
    }));

    playerPositions = gameState.playerPositions;
    currentPlayerTurn = gameState.currentPlayerTurn;

    createPath();
    initializeTooltips();
}

function togglePlayerMenu() {
    const menu = document.getElementById('playerMenu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    updatePlayersList();
}

function updatePlayersList() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    players.forEach((player, index) => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="player-info-container">
                <div class="player-icon player${player.id}"></div>
                <span class="player-name">${player.name}</span>
                <button onclick="renamePlayer(${index})" class="rename-button">✏️</button>
            </div>
            <button onclick="removePlayer(${index})" class="delete-button">Удалить</button>
        `;
        playersList.appendChild(playerItem);
    });
}

function updateAllPlayerPositions() {
    players.forEach((player, index) => {
        if (circles[playerPositions[index]]) {
            positionPlayerNearCircle(circles[playerPositions[index]], player.element, index);
        }
    });
}

function addPlayer() {
    let newId = 1;
    const usedIds = players.map(p => p.id);
    while (usedIds.includes(newId)) {
        newId++;
    }

    const playerDiv = document.createElement('div');
    playerDiv.className = 'player';
    playerDiv.classList.add(`player${newId}`);

    const tooltip = document.createElement('div');
    tooltip.className = 'player-tooltip';
    document.body.appendChild(tooltip);

    playerDiv.addEventListener('mouseenter', function (e) {
        const player = players.find(p => p.element === this);
        if (player) {
            tooltip.textContent = player.name;
            tooltip.style.opacity = '1';

            const rect = this.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.left = rect.left + (rect.width / 2) + 'px';
            tooltip.style.top = rect.top - 30 + 'px';
        }
    });

    playerDiv.addEventListener('mouseleave', function () {
        tooltip.style.opacity = '0';
    });

    container.appendChild(playerDiv);

    players.push({
        id: newId,
        element: playerDiv,
        name: `Игрок ${newId}`,
        score: 0
    });
    playerPositions.push(0);

    const firstCircle = circles[0];
    updateAllPlayerPositions();

    updatePlayersList();
    updatePlayerListCorner();
    saveGameState();
}

function removePlayer(index) {
    const player = players[index];
    if (player.element && player.element.parentNode) {
        player.element.remove();
    }

    players.splice(index, 1);
    playerPositions.splice(index, 1);

    if (players.length === 0) {
        document.getElementById('currentPlayer').textContent = '';
        currentPlayerTurn = 0;
    } else if (currentPlayerTurn >= players.length) {
        currentPlayerTurn = 0;
    }

    if (circles.length > 0) {
        players.forEach((player, i) => {
            if (circles[playerPositions[i]]) {
                positionPlayerNearCircle(circles[playerPositions[i]], player.element, i);
            }
        });
    }

    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    if (players.length > 0) {
        players.forEach((player, idx) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <div class="player-info-container">
                    <div class="player-icon player${player.id}"></div>
                    <span class="player-name">${player.name}</span>
                    <button onclick="renamePlayer(${idx})" class="rename-button">✏️</button>
                </div>
                <button onclick="removePlayer(${idx})" class="delete-button">Удалить</button>
            `;
            playersList.appendChild(playerItem);
        });
    }

    updateCurrentPlayerDisplay();
    updatePlayerListCorner();
    saveGameState();
}

function renamePlayer(index) {
    const player = players[index];
    const newName = prompt('Введите новое имя игрока:', player.name);

    if (newName !== null && newName.trim() !== '') {
        player.name = newName.trim();
        updatePlayersList();
        updateCurrentPlayerDisplay();
        updatePlayerListCorner();
        saveGameState();
    }
}

function skipTurn() {
    currentPlayerTurn = (currentPlayerTurn + 1) % players.length;
    updateCurrentPlayerDisplay();
    document.getElementById('stepsInput').value = '';
    saveGameState();
}

function initializeTooltips() {
    document.querySelectorAll('.player-tooltip').forEach(t => t.remove());

    players.forEach(player => {
        const tooltip = document.createElement('div');
        tooltip.className = 'player-tooltip';
        document.body.appendChild(tooltip);

        player.element.addEventListener('mouseenter', function () {
            tooltip.textContent = player.name;
            tooltip.style.opacity = '1';

            const rect = this.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.left = rect.left + (rect.width / 2) + 'px';
            tooltip.style.top = rect.top - 30 + 'px';
        });

        player.element.addEventListener('mouseleave', function () {
            tooltip.style.opacity = '0';
        });
    });
}

// Функция для установки предустановленного значения ходов
function setSteps(value) {
    document.getElementById('stepsInput').value = value;
}

// Функция для обновления списка игроков в правом верхнем углу
function updatePlayerListCorner() {
    const container = document.getElementById('playerListContent');
    container.innerHTML = '';
    players.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'corner-player-item';
        const icon = document.createElement('div');
        icon.className = `corner-player-icon player${player.id}`;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${player.name} (${player.score})`;
        item.appendChild(icon);
        item.appendChild(nameSpan);
        container.appendChild(item);
    });
}

// Функция для переключения видимости списка игроков
function togglePlayerList() {
    const list = document.getElementById('playerListContent');
    const btn = document.getElementById('togglePlayerList');
    if (list.style.display === 'none' || list.style.display === '') {
        list.style.display = 'block';
        btn.textContent = "Скрыть список игроков";
    } else {
        list.style.display = 'none';
        btn.textContent = "Показать список игроков";
    }
}

// Функция для загрузки настроек
function loadSettings() {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    } else {
        localStorage.setItem('gameSettings', JSON.stringify(settings));
    }

    document.getElementById('enableDuels').checked = settings.enableDuels;
    document.getElementById('enableQuestions').checked = settings.enableQuestions;
    document.getElementById('enableBlitz').checked = settings.enableBlitz;
    document.getElementById('moveSpeed').value = settings.moveSpeed;
    document.getElementById('blitzCells').value = settings.blitzCells.join(', ');
    document.getElementById('questionCells').value = settings.questionCells.join(', ');
    document.getElementById('duelCells').value = settings.duelCells.join(', ');
}

// Функция для сохранения настроек
function saveSettings() {
    settings.enableDuels = document.getElementById('enableDuels').checked;
    settings.enableQuestions = document.getElementById('enableQuestions').checked;
    settings.enableBlitz = document.getElementById('enableBlitz').checked;
    settings.moveSpeed = parseInt(document.getElementById('moveSpeed').value);
    settings.blitzCells = document.getElementById('blitzCells').value
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));
    settings.questionCells = document.getElementById('questionCells').value
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));
    settings.duelCells = document.getElementById('duelCells').value
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));
    localStorage.setItem('gameSettings', JSON.stringify(settings));
}

// Функция для переключения видимости меню настроек
function toggleSettings() {
    const menu = document.getElementById('settingsMenu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    if (menu.style.display === 'flex') {
        loadSettings();
    } else {
        saveSettings();
    }
}

// Функция для сброса значений к значениям по умолчанию
function resetToDefault(type) {
    switch (type) {
        case 'blitz':
            document.getElementById('blitzCells').value = defaultSettings.blitzCells.join(', ');
            settings.blitzCells = [...defaultSettings.blitzCells];
            break;
        case 'question':
            document.getElementById('questionCells').value = defaultSettings.questionCells.join(', ');
            settings.questionCells = [...defaultSettings.questionCells];
            break;
        case 'duel':
            document.getElementById('duelCells').value = defaultSettings.duelCells.join(', ');
            settings.duelCells = [...defaultSettings.duelCells];
            break;
    }
    saveSettings();
}