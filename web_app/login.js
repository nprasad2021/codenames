let conn;
let lastRoom, lastUsername, creator;
let currentTeam = "RED";
let currentRole = "SPYMASTER";

function sendRoom(queryType) {
    let q = queryType;
    return function () {
        let name = document.querySelector('input[name="user"]');
        let room = document.querySelector('input[name="room"]');

        if (!conn) {
            return false;
        }
        if (!room || !name) {
            return false;
        }
        lastRoom = room.value;
        lastUsername = name.value;
        creator = queryType !== "joinRoom";

        let msg = JSON.stringify({
            "type": q, "username": name.value,
            "room": room.value
        });
        conn.send(msg);
        room.value = "";
        name.value = "";
        return false;
    }
}

document.querySelector(".createRoom").onsubmit = sendRoom("createRoom");
document.querySelector(".joinRoom").onsubmit = sendRoom("joinRoom");

/////////////////////////////////////////////////////////////////////////

let approveParts = document.querySelector("#approveParts");
approveParts.addEventListener("click", function () {
    let msg = JSON.stringify({
        "type": "roleAssn",
        "username": lastUsername,
        "room": lastRoom,
        "role": currentRole,
        "team": currentTeam
    });
    console.log("msg send:", msg);
    if (!conn) {
        console.log("connections does not exist");
    }
    conn.send(msg);
    return false;
});

/////////////////////////////////////////////////////////////////////////
let selectTeamButton = document.querySelector("#selectTeam");
let selectRoleButton = document.querySelector("#selectRole");

let selectButtonFn = function () {
    let teamIndex = selectTeamButton.selectedIndex;
    let roleIndex = selectRoleButton.selectedIndex;

    let msg = JSON.stringify({
        "type": "roleAssn",
        "username": lastUsername,
        "room": lastRoom,
        "role": selectRoleButton.options[roleIndex].value,
        "team": selectTeamButton.options[teamIndex].value,
    });
    if (!conn) {
        return;
    }
    conn.send(msg);
};

selectTeamButton.addEventListener("change", selectButtonFn);
selectRoleButton.addEventListener("change", selectButtonFn);
/////////////////////////////////////////////////////////////////////////
let startGameButton = document.querySelector("#teamsUI > button");
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

function submitClue(){
    if (!conn) {
        return;
    }
    let clue = document.querySelector("#clue");
    if (clue.value === "") {
        return;
    }
    let word = clue.value;
    let freq = document.querySelector("#numWords").selectedIndex + 1;

    let msg = JSON.stringify({
        "type": "spyMove",
        "username": lastUsername,
        "room": lastRoom,
        "word": word,
        "num": (freq+1).toString(),
    });
    console.log("submit msg", msg);
    conn.send(msg);
}

function passClue(){
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

function renderGame(parts) {
    let gameEncoding = parts[1];
    let clickable = parts[2];
    let cR = parts[3].split(",")[0];
    // let cT = parts[3].split(",")[1];
    let spyTools = document.querySelector("#spyTools");
    let guessTools = document.querySelector("#guessTools");
    let submitButton = document.querySelector("#submitClue");
    let passButton = document.querySelector("#passBtn");
    if (cR === "GUESSER") {
        spyTools.classList.add("isHidden");
        guessTools.classList.remove("isHidden");
        if (clickable === "1"){
            passButton.classList.remove("isHidden");
        } else {
            passButton.classList.add("isHidden");
        }
    } else {
        passButton.classList.add("isHidden");
        if (clickable === "0"){
            spyTools.classList.add("isHidden");
        } else {
            spyTools.classList.remove("isHidden");
        }
        guessTools.classList.add("isHidden");
    }

    if (clickable === "1" && currentRole === "SPYMASTER") {
        submitButton.onclick = submitClue;
    }

    if (clickable === "1" && currentRole === "GUESSER") {
        passButton.onclick = passClue;
    }

    let cells = gameEncoding.split(";");
    let board = document.querySelector("#board");
    board.innerHTML = "";
    for (let i = 0; i < cells.length; i++) {
        let tmpArr = cells[i].split(",");
        let word = tmpArr[0];
        let textColor = tmpArr[1].toLowerCase();
        let backgroundColor = tmpArr[2].toLowerCase();

        let cellBtn = document.createElement("button");
        cellBtn.textContent = word;
        cellBtn.classList.add(textColor + "Text");
        cellBtn.classList.add(backgroundColor + "Background");
        if (clickable === "1" && currentRole !== "SPYMASTER") {
            cellBtn.onclick = function () {
                respondToButton(i);
            };
        } else {
            cellBtn.disabled = true;
        }

        board.append(cellBtn);
    }
}

/////////////////////////////////////////////////////////////////////////

let connResponse = function (evt) {
    let data = evt.data;
    console.log(data);
    if (data.includes("createRoom")) {
        let parts = data.split(":");
        if (parts[1] === "FAILURE") {
            let errOutput = document.querySelector("#loginUI > div");
            errOutput.innerHTML = parts[2]
        }
    }
    if (data.includes("joinRoom")) {
        if (data.includes("FAILURE")) {
            let errOutput = document.querySelector("#loginUI > div");
            errOutput.innerHTML = "ERROR with ROOM SELECTION"
        } else {
            let loginUI = document.querySelector("#loginUI");
            loginUI.classList.add("isHidden");
            let partUI = document.querySelector("#participantsUI");
            partUI.classList.remove("isHidden");

            let names = data.split(":")[1].split(",");
            let partList = partUI.querySelector("ul");

            if (names.length >= 4 && creator && approveParts.classList.contains("isHidden")) {
                approveParts.classList.remove("isHidden");
            }
            partList.innerHTML = "";
            for (let name of names) {
                let listItem = document.createElement("li");
                listItem.innerText = name;
                partList.append(listItem);
            }
        }
    } else if (data.includes("roleAssn")) {
        let partUI = document.querySelector("#participantsUI");
        partUI.classList.add("isHidden");
        let teamsUI = document.querySelector("#teamsUI");
        teamsUI.classList.remove("isHidden");

        let redTeam = teamsUI.querySelector(".rTeam > ul");
        let blueTeam = teamsUI.querySelector(".bTeam > ul");
        redTeam.innerHTML = "";
        blueTeam.innerHTML = "";

        let players = data.split(":")[1].split(";");
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

            if (tm === "BLUE") {
                tm = blueTeam;
            } else {
                tm = redTeam;
            }
            liEl = document.createElement("li");
            liEl.innerText = un + " " + rl;
            tm.append(liEl);
        }
        if (data.split(":")[2] === "APPROVE" && creator) {
            startGameButton.classList.remove("isHidden");
        }
    } else if (data.includes("initGame")) {
        let teamsUI = document.querySelector("#teamsUI");
        teamsUI.classList.add("isHidden");
        let gameUI = document.querySelector("#gameUI");
        gameUI.classList.remove("isHidden");
        let parts = data.split(":");
        let credentials = document.querySelector("#personalCredentials");
        credentials.innerHTML = "<b>" + lastUsername + "</b> playing <b>" + currentRole + "</b> for the <b>" + currentTeam + "</b>";
        renderGame(parts);
    } else if (data.includes("guessSetup")) {
        let parts = data.split(":");
        renderGame(parts);
        let word = parts[4].split(",")[0];
        let freq = parts[4].split(",")[1];
        document.querySelector("#wordEntry").innerHTML = word;
        document.querySelector("#freqEntry").innerHTML = freq;
    } else if (data.includes("spySetup")) {
        let parts = data.split(":");
        renderGame(parts);
    } else if (data.includes("victory")){

    }
};


//////////////////////////////////////////////////////////////////
let err = document.querySelector(".err");
if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + document.location.host + "/ws");
    conn.onclose = function () {
        err.innerHTML = "The webserver has crashed. Come play another time.";
    };
    conn.onmessage = connResponse
} else {
    err.innerHTML = "<b>Your browser does not support WebSockets.</b>";
}

