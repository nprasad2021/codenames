let conn;
let lastRoom, lastUsername, creator;
const CODEMASTER = "CODEMASTER";
const GUESSER = "GUESSER";

let currentTeam = "RED";
let currentRole = CODEMASTER;

let lastSentMessageUser = "";

function processInputElement(msg) {
    console.log(msg);
    let textMsg = msg.replace(/,/g, "");
    textMsg = textMsg.replace(/;/g, "");
    textMsg = textMsg.replace(/:/g, "");
    return textMsg;
}

function sendRoom(queryType) {
    let q = queryType;
    return function () {
        let name = document.querySelector('input[name="user"]');
        let room = document.querySelector('input[name="room"]');
        console.log(name.value, room.value, !conn);
        if (!conn) {
            return false;
        }
        if (!processInputElement(name.value)) {
            return false;
        }
        if (queryType === "joinRoom" && !processInputElement(room.value)) {
            return false;
        }

        lastUsername = processInputElement(name.value);
        lastRoom = processInputElement(room.value);
        creator = queryType !== "joinRoom";

        let msg = JSON.stringify({
            "type": q, "username": lastUsername,
            "room": processInputElement(room.value),
        });
        conn.send(msg);
        //room.value = "";
        //name.value = "";
        return false;
    }
}

let createRoomButton = document.querySelector(".createRoom");
createRoomButton.onclick = sendRoom("createRoom");
let joinRoomButton = document.querySelector(".joinRoom");
let roomButtons = document.querySelector("#roomBtns");
document.querySelector("#join").onclick = sendRoom("joinRoom");
document.querySelector("#cancel").onclick = function () {
    document.querySelector("#roomName").classList.add("isHidden");
    document.querySelector("#loginBtns").classList.remove("isHidden");
    roomButtons.classList.add("isHidden");
};

joinRoomButton.onclick = function () {
    document.querySelector("#roomName").classList.remove("isHidden");
    document.querySelector("#loginBtns").classList.add("isHidden");
    roomButtons.classList.remove("isHidden");
};


/////////////////////////////////////////////////////////////////////////


let messageInput = document.querySelector(".messageInput");
messageInput.addEventListener("keyup", function (evt) {
    if (!conn) {
        return;
    }
    let textMsg = processInputElement(messageInput.value);
    if (evt.key === "Enter") {
        messageInput.value = "";
        if (textMsg !== "") {
            let msg = JSON.stringify({
                "type": "text",
                "username": lastUsername,
                "room": lastRoom,
                "msg": textMsg,
            });
            conn.send(msg);
        }
    }
});

/////////////////////////////////////////////////////////////////////////

let roleButtons = document.querySelectorAll("#roleBtns > button");
let teamButtons = document.querySelectorAll("#teamBtns > button");
let roleButtonFn = function (evt) {
    if (evt.target.classList.contains("deadBackground")) {
        return;
    }
    for (let b of roleButtons) {
        b.classList.remove("deadBackground");
        b.classList.remove("whiteText");
    }
    evt.target.classList.add("deadBackground");
    evt.target.classList.add("whiteText");

    let msg = JSON.stringify({
        "type": "roleAssn",
        "username": lastUsername,
        "room": lastRoom,
        "role": evt.target.value,
        "team": currentTeam,
    });
    if (!conn) {
        return;
    }
    conn.send(msg);
};

let teamButtonFn = function (evt) {
    if (evt.target.classList.contains("whiteText")) {
        return;
    }
    for (let b of teamButtons) {
        b.classList.remove("redBackground");
        b.classList.remove("blueBackground");
        b.classList.remove("whiteText");
    }

    evt.target.classList.add(evt.target.value.toLowerCase() + "Background");
    evt.target.classList.add("whiteText");

    let msg = JSON.stringify({
        "type": "roleAssn",
        "username": lastUsername,
        "room": lastRoom,
        "role": currentRole,
        "team": evt.target.value,
    });
    if (!conn) {
        return;
    }
    conn.send(msg);

};

for (let b of roleButtons) {
    b.onclick = roleButtonFn;
}

for (let b of teamButtons) {
    b.onclick = teamButtonFn;
}
/////////////////////////////////////////////////////////////////////////
let startGameButton = document.querySelector("#startGameButton");
startGameButton.addEventListener("click", function () {
    if (!conn) {
        return;
    }
    let msg = JSON.stringify({
        "type": "startGame",
        "username": lastUsername,
        "room": lastRoom,
    });
    conn.send(msg);
});

/////////////////////////////////////////////////////////////////////////
let newGameProp = document.querySelector("#newGameBtn");
newGameProp.onclick = function () {
    if (!conn) {
        return;
    }
    let msg = JSON.stringify({
        "type": "newGame",
        "username": lastUsername,
        "room": lastRoom,
    });
    conn.send(msg);
};


/////////////////////////////////////////////////////////////////////////
function respondToButton(index) {
    let msg = JSON.stringify({
        "type": "guessMove",
        "username": lastUsername,
        "room": lastRoom,
        "cell": index.toString(),
    });

    if (!conn) {
        return;
    }
    conn.send(msg);
}

function submitClue() {
    if (!conn) {
        return;
    }
    let clue = document.querySelector("#clue");
    if (clue.value === "" || clue.value.includes(" ")) {
        clue.value = "";
        return;
    }
    let word = processInputElement(clue.value);
    clue.value = "";
    if (word === "") {
        return;
    }
    let freq = document.querySelector("#numWords").selectedIndex + 1;

    let msg = JSON.stringify({
        "type": "spyMove",
        "username": lastUsername,
        "room": lastRoom,
        "word": word,
        "num": freq.toString(),
    });
    console.log("submit msg", msg);
    conn.send(msg);
}

function passClue() {
    if (!conn) {
        return;
    }

    let msg = JSON.stringify({
        "type": "pass",
        "username": lastUsername,
        "room": lastRoom,
    });
    console.log("submit msg", msg);
    conn.send(msg);
}

function renderScore(parts) {
    let numBlueClicked = parts[4].split(",")[1];
    let numRedClicked = parts[4].split(",")[0];

    document.querySelector("#numBlueClicked").innerHTML = numBlueClicked;
    document.querySelector("#numRedClicked").innerHTML = numRedClicked;
}

function renderUsernameHeading(parts) {
    let cR = parts[3].split(",")[0];
    let cT = parts[3].split(",")[1];
    let usernameHeading = document.querySelector(".usernameHeading");
    let userClass = currentTeam.toLowerCase() + "Text";
    let userClassSpan = '<span class="' + userClass + '">' + currentTeam.toLowerCase() + '</span>';
    usernameHeading.innerHTML = lastUsername + ', you are the ' + userClassSpan + " " + currentRole.toLowerCase() + ". ";
    if (parts[0].includes("victory")) {
        let victor = parts[5];
        if (victor === currentTeam) {
            usernameHeading.innerHTML += "You won!";
        } else {
            usernameHeading.innerHTML += "You lost!";
        }
    } else {
        let appendAnnounce = "";
        if (cR === currentRole && cT === currentTeam) {
            appendAnnounce = "It's your turn!"
        } else {
            let otherClass = cT.toLowerCase() + "Text";
            let otherClassSpan = '<span class="' + otherClass + '">' + cT.toLowerCase() + '</span>';
            appendAnnounce = "Waiting for the " + otherClassSpan + " " + cR.toLowerCase() + "."
        }
        usernameHeading.innerHTML += appendAnnounce;
    }

}

function populateBoard(board, cells, clickable) {
    console.log("clickable: ", clickable);
    for (let i = 0; i < cells.length; i++) {
        let tmpArr = cells[i].split(",");
        let word = tmpArr[0];
        let textColor = tmpArr[1].toLowerCase();
        let backgroundColor = tmpArr[2].toLowerCase();

        let cellBtn = document.createElement("button");
        cellBtn.textContent = word;
        cellBtn.classList.add(textColor + "Text");
        cellBtn.classList.add(backgroundColor + "Background");
        if (clickable === "1" && currentRole === GUESSER) {
            cellBtn.onclick = function () {
                respondToButton(i);
            };
        } else {
            cellBtn.disabled = true;
        }

        board.append(cellBtn);
    }
}

function renderGame(parts) {
    let gameEncoding = parts[1];
    let clickable = parts[2];

    renderScore(parts);
    renderUsernameHeading(parts);

    let spyTools = document.querySelector("#spyTools");
    let guessTools = document.querySelector("#guessTools");
    let submitButton = document.querySelector("#submitClue");
    let passButton = document.querySelector("#passBtn");
    let newGameButton = document.querySelector("#new-game-container");
    newGameButton.classList.add("isHidden");
    let cR = parts[3].split(",")[0];
    if (parts[0] === "victory") {
        spyTools.classList.add("isHidden");
        guessTools.classList.add("isHidden");
        guessTools.classList.remove("guessTools");
        newGameButton.classList.remove("isHidden");
    } else if (cR === GUESSER) {

        spyTools.classList.add("isHidden");
        guessTools.classList.remove("isHidden");
        guessTools.classList.add(".guessTools");
        if (clickable === "1") {
            passButton.classList.remove("isHidden");
            passButton.classList.add("gameButton");
        } else {
            passButton.classList.add("isHidden");
            passButton.classList.remove("gameButton");
        }
    } else if (cR === CODEMASTER) {
        guessTools.classList.add("isHidden");
        guessTools.classList.remove("guessTools");
        if (clickable === "0") {
            spyTools.classList.add("isHidden");
        } else {
            spyTools.classList.remove("isHidden");
        }

    }
    console.log(spyTools.classList);

    if (clickable === "1" && currentRole === CODEMASTER) {
        submitButton.onclick = submitClue;
    } else {
        submitButton.onclick = function () {
        };
    }

    if (clickable === "1" && currentRole === GUESSER) {
        passButton.onclick = passClue;
    } else {
        passButton.onclick = function () {
        };
    }

    let cells = gameEncoding.split(";");
    let board = document.querySelector("#boardUI");
    board.innerHTML = "";
    populateBoard(board, cells, clickable);
}

/////////////////////////////////////////////////////////////////////////
nextGameFn = function () {
    if (!conn) {
        return
    }
    let msg = JSON.stringify({
        "type": "newGame",
        "username": lastUsername,
        "room": lastRoom,
    });
    conn.send(msg);
};

/////////////////////////////////////////////////////////////////////////

let sectionsRelevant = ["#teamsUI", "#gameUI"];

function clear() {
    for (let s of sectionsRelevant) {
        document.querySelector(s).classList.add("isHidden");
    }
}

let createRoomResponse = function (data) {
    let parts = data.split(":");
    if (parts[1] === "FAILURE") {
        let errOutput = document.querySelector(".loginError");
        errOutput.innerHTML = parts[2]
    }
};

let initGameWindow = function () {
    let loginUI = document.querySelector("#homePage");
    loginUI.classList.remove("block-container");
    loginUI.classList.add("isHidden");
    let mainScreen = document.querySelector("#mainScreen");
    mainScreen.classList.remove("isHidden");
    mainScreen.classList.add('block-container');
    let messageHeader = document.querySelector(".messageHeader");
    messageHeader.innerHTML = "game code: " + lastRoom;
};

let roleAssnResponse = function (data) {

    let parts = data.split(":");
    lastRoom = parts[1];
    clear();
    initGameWindow();

    let usernameHeading = document.querySelector(".usernameHeading");
    usernameHeading.innerHTML = "Welcome " + lastUsername + "!";
    usernameHeading.innerHTML += " The game join code is " + lastRoom;

    let teamsUI = document.querySelector("#teamsUI");
    teamsUI.classList.remove("isHidden");
    let codeHead = teamsUI.querySelector(".codemaster > ul");
    let guessHead = teamsUI.querySelector(".guesser > ul");
    codeHead.innerHTML = "";
    guessHead.innerHTML = "";

    let players = data.split(":")[2].split(";");
    console.log(players);
    for (let p of players) {
        let meta = p.split(",");
        let un = meta[0];
        let rl = meta[1];
        let tm = meta[2];

        if (un === lastUsername) {
            currentTeam = tm;
            currentRole = rl;
        }
        let col = guessHead;
        if (rl === CODEMASTER) {
            col = codeHead
        }
        let userClass = tm.toLowerCase() + "Text";
        let prepend = '<span class="' + userClass + '">' + un + '</span>';
        liEl = document.createElement("li");
        liEl.innerHTML = prepend;
        col.append(liEl);
    }
    let respOutput = document.querySelector("#respOutput");
    let proceedIfComplete = data.split(":")[3];
    if (proceedIfComplete.includes("APPROVE")) {
        startGameButton.classList.remove("isHidden");
        respOutput.classList.add("isHidden");
        respOutput.classList.remove("loginError");
    } else {
        startGameButton.classList.add("isHidden");
        respOutput.innerHTML = "";
        respOutput.classList.remove("isHidden");
        respOutput.classList.add("loginError");
        respOutput.innerHTML = proceedIfComplete.split(",")[1];
    }

};

let initGameResponse = function (data) {
    initGameWindow();
    let teamsUI = document.querySelector("#teamsUI");
    teamsUI.classList.add("isHidden");
    let gameUI = document.querySelector("#gameUI");
    gameUI.classList.remove("isHidden");
    let parts = data.split(":");
    // let credentials = document.querySelector("#personalCredentials");
    // credentials.innerHTML = "You are the <b>" + currentTeam.toLowerCase() + "</b> <b>" + currentRole.toLowerCase() + "</b>";
    renderGame(parts);
};


let guessSetupResponse = function (data) {
    initGameWindow();
    let gameUI = document.querySelector("#gameUI");
    gameUI.classList.remove("isHidden");
    let parts = data.split(":");
    renderGame(parts);
    let word = parts[6].split(",")[0];
    let freq = parts[6].split(",")[1];

    let cT = parts[3].split(",")[1];

    let prepend = "";
    let freqPrepend = "";
    if (cT === currentTeam) {
        prepend = "Your clue is ";
        freqPrepend = "You have ";
    } else {
        let userClass = cT.toLowerCase() + "Text";
        let userClassSpan = '<span class="' + userClass + '">' + cT.toLowerCase() + '</span>';
        prepend = "The " + userClassSpan + " team's clue is ";
        freqPrepend = "They have ";
    }
    let wordSpan = '<span class="bolder">' + word + '</span>';
    let freqSpan = '<span class="bolder">' + freq + '</span>';
    let wordEntryMod = document.querySelector("#wordEntry");
    wordEntryMod.innerHTML = prepend + wordSpan + ". ";
    wordEntryMod.innerHTML += freqPrepend + freqSpan + " guesses.";
};

let victoryResponse = function (data) {
    let parts = data.split(":");
    initGameWindow();
    renderGame(parts);
    let gameUI = document.querySelector("#gameUI");
    gameUI.classList.remove("isHidden");

    let victoryDiv = document.querySelector("#currentTurn");
    let p = document.createElement("p");
    p.innerHTML = "Victory for the <b>" + parts[4] + "</b> team";
    victoryDiv.append(p);
    if (creator) {
        let nextGameBtn = document.createElement("button");
        nextGameBtn.onclick = function () {

        };
        victoryDiv.append(nextGameBtn)
    }
};

let textResponse = function (data) {
    let parts = data.split(":");
    let username = parts[1];
    let textContent = parts[2];
    let msgPane = document.querySelector(".messagePane");
    console.log("msg:", msgPane.scrollHeight, msgPane.clientHeight, msgPane.scrollHeight - msgPane.clientHeight);
    let adjust = true;
    if (msgPane.scrollHeight - msgPane.clientHeight !== msgPane.scrollTop) {
        adjust = false;
    }
    let containerElement = document.createElement("div");
    if (lastSentMessageUser !== username) {
        let nameElement = document.createElement("div");
        nameElement.classList.add("sentName");
        nameElement.innerHTML = username;
        containerElement.append(nameElement);
    }
    if (lastSentMessageUser !== username && lastSentMessageUser !== lastUsername) {
        containerElement.classList.add("spaceMsg");
    }
    lastSentMessageUser = username;

    let msgElement = document.createElement("div");
    msgElement.classList.add("sentMsg");
    msgElement.innerHTML = textContent;

    containerElement.append(msgElement);
    if (username === lastUsername) {
        containerElement.classList.add("rightSide");
        msgElement.classList.add("right");
    } else {
        containerElement.classList.add("leftSide");
        msgElement.classList.add("left");
    }

    msgPane.append(containerElement);

    if (adjust) {
        msgPane.scrollTop = msgPane.scrollHeight - msgPane.clientHeight;
    }

};

let connResponse = function (evt) {
    let data = evt.data;
    console.log(data);
    let keyWord = data.split(":")[0];
    if (keyWord === "createRoom") {
        createRoomResponse(data);
    } else if (keyWord === "roleAssn") {
        roleAssnResponse(data);
    } else if (keyWord === "initGame") {
        initGameResponse(data);
    } else if (keyWord === "guessSetup") {
        guessSetupResponse(data);
    } else if (keyWord === "spySetup") {
        initGameWindow();
        let gameUI = document.querySelector("#gameUI");
        gameUI.classList.remove("isHidden");
        renderGame(data.split(":"));
    } else if (keyWord === "victory") {
        victoryResponse(data);
    } else if (keyWord === "text") {
        textResponse(data);
    } else if (keyWord === "reassign"){
        let parts = data.split(":");
        currentRole = parts[2];
        currentTeam = parts[1];
    }
};


//////////////////////////////////////////////////////////////////

function initializeGameDemo() {
    let gameEncoding = "Teacher,BLUE,WHITE;Brush,BLUE,WHITE;Parachute,NEUTRAL,WHITE;Stock,NEUTRAL,WHITE;Cold,DEAD,WHITE;Watch,BLUE,WHITE;Pin,WHITE,NEUTRAL;Hook,WHITE,RED;Shakespeare,RED,WHITE;India,BLUE,WHITE;Pumpkin,RED,WHITE;Laser,WHITE,RED;Rock,NEUTRAL,WHITE;Belt,NEUTRAL,WHITE;Europe,WHITE,BLUE;Center,WHITE,RED;Lawyer,RED,WHITE;Pan,WHITE,BLUE;Press,RED,WHITE;Chocolate,NEUTRAL,WHITE;Giant,NEUTRAL,WHITE;Water,RED,WHITE;Pirate,RED,WHITE;Star,WHITE,BLUE;Cricket,WHITE,BLUE";
    let cells = gameEncoding.split(";");
    let board = document.querySelector("#homePage > .board");
    board.innerHTML = "";
    populateBoard(board, cells, "0");
}

initializeGameDemo();


//////////////////////////////////////////////////////////////////

let err = document.querySelector(".err");
if (window["WebSocket"]) {
    conn = new WebSocket("wss://" + document.location.host + "/ws");
    conn.onclose = function () {
        err.innerHTML = "The webserver has crashed. Come play another time.";
    };
    conn.onmessage = connResponse
} else {
    err.innerHTML = "<b>Your browser does not support WebSockets.</b>";
}