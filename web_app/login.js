let conn;
let body = document.querySelector("body");
let lastRoom, lastUsername, creator;

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

if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + document.location.host + "/ws");
    conn.onclose = function (evt) {

    };
    conn.onmessage = function (evt) {
        let div = document.createElement("div");
        div.innerHTML = evt.data;
        body.append(div);
        if (evt.data == "Success") {
            window.localStorage.setItem("username", lastUsername);
            window.localStorage.setItem("room", lastRoom);
            window.localStorage.setItem("creator", creator);
            window.location.href = "teams.html"
        }
    };
} else {

    let item = document.createElement("div");
    item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
    body.append(item);
}

