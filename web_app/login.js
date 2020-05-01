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
        lastRoom = room;
        lastUsername = name;
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
    if (!conn){
        return false;
    }
    conn.send(msg);
    return false;
});

/////////////////////////////////////////////////////////////////////////

let connResponse = function(evt) {
  let data = evt.data;
  console.log(data);
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
          if (partList.length >= 4 && creator && approveParts.classList.contains("isHidden")) {
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

  }
};


//////////////////////////////////////////////////////////////////
if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + document.location.host + "/ws");
    conn.onclose = function (evt) {

    };
    conn.onmessage = connResponse
} else {
    let item = document.createElement("div");
    item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
    document.body.append(item);
}

