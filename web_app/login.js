let conn;
let body = document.querySelector("body");
let lastRoom, lastUsername, creator;
let currentTeam = "red";

function sendRoom(queryType) {
    let q = queryType;
    return function () {
        let roomForm = document.querySelector("." + q);
        let name = roomForm.querySelector('input[name="user"]');
        let room = roomForm.querySelector('input[name="room"]');
        let password = roomForm.querySelector('input[name="password"]');

        if (!conn) {
            return false;
        }
        if (!room || !password || !name) {
            return false;
        }
        lastRoom = room;
        lastUsername = name;
        creator = queryType !== "joinRoom";

        let msg = JSON.stringify({"type": q, "username": name.value,
            "room": room.value, "password": password.value});
        conn.send(msg);
        room.value = "";
        password.value = "";
        name.value = "";
        return false;
    }
}

document.querySelector(".createRoom").onsubmit = sendRoom("createRoom");
document.querySelector(".joinRoom").onsubmit = sendRoom("joinRoom");
document.querySelector(".red > button").addEventListener("click", function () {
    let msg = JSON.stringify({"type": "redSwitch", })
    conn.send()
})

let loginSuccess = function(evt) {
    if (evt.data === "Success") {
        let loginUI = document.querySelector("section#loginUI");
        loginUI.classList.add("isHidden");
        let teamUI = document.querySelector("section#teamsUI");
        teamUI.classList.remove("isHidden");

    }
};



if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + document.location.host + "/ws");
    conn.onclose = function (evt) {

    };
    conn.onmessage = loginSuccess
} else {
    let item = document.createElement("div");
    item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
    body.append(item);
}

