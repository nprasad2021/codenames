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

        let msg = JSON.stringify({"type": q, "username": name.value,
            "room": room.value});
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
approveParts.addEventListener("click", function() {
    let msg = JSON.stringify({"type": "roleAssn",
        "username": lastUsername,
        "room": lastRoom,
        "role": currentRole,
        "team": currentTeam});
    console.log("msg send:", msg);
    if (!conn){
        console.log("connections does not exist");
    }
    conn.send(msg);
    return false;
});

/////////////////////////////////////////////////////////////////////////
let selectTeamButton = document.querySelector("#selectTeam");
let selectRoleButton = document.querySelector("#selectRole");

let selectButtonFn = function() {
    let teamIndex = selectTeamButton.selectedIndex;
    let roleIndex = selectRoleButton.selectedIndex;

    let msg = JSON.stringify({"type": "roleAssn",
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
    let msg = JSON.stringify({"type": "startGame",
        "username": lastUsername,
        "room": lastRoom,
    });
    conn.send(msg);
});
/////////////////////////////////////////////////////////////////////////
function renderGame(gameEncoding) {

}
/////////////////////////////////////////////////////////////////////////

let connResponse = function(evt) {
  let data = evt.data;
  console.log(data);
  if (data.includes("createRoom")) {
      let parts = data.split(":");
      if (parts[1] === "FAILURE") {
          let errOutput = document.querySelector("#loginUI > div");
          errOutput.innerHTML = parts[2]
      }
  }
  if (data.includes("joinRoom")){
      if (data.includes("FAILURE")) {
          let errOutput = document.querySelector("#loginUI > div");
          errOutput.innerHTML = "ERROR with ROOM SELECTION"
      } else {
          let loginUI = document.querySelector("#loginUI");
          loginUI.classList.add("isHidden");
          let partUI = document.querySelector("#participantsUI");
          if (partUI.classList.contains("isHidden")) {
              partUI.classList.remove("isHidden")
          }
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
        if (!partUI.classList.contains("isHidden")) {
            partUI.classList.add("isHidden")
        }
        let teamsUI = document.querySelector("#teamsUI");
        if (teamsUI.classList.contains("isHidden")) {
            teamsUI.classList.remove("isHidden");
        }
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

            if (un == lastUsername) {
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
        if (data.split(":")[2] === "APPROVE" && creator){
            if (startGameButton.classList.contains("isHidden")) {
                startGameButton.classList.remove("isHidden")
            }
        }
  } else if (data.includes("initGame")) {

  }
};


//////////////////////////////////////////////////////////////////
let err = document.querySelector(".err");
if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + document.location.host + "/ws");
    conn.onclose = function (evt) {
        err.innerHTML = "The webserver has crashed. Come play another time.";
    };
    conn.onmessage = connResponse
} else {
    err.innerHTML = "<b>Your browser does not support WebSockets.</b>";
}

