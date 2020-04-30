let conn;
let body = document.querySelector("body");

document.querySelector("form").onsubmit = function () {
    let name = document.querySelector('input[name="user"]');
    let room = document.querySelector('input[name="room"]');
    let password = document.querySelector('input[name="password"]');
    if (!conn) {
        return false;
    }
    if (!room || !password || !name) {
        return false;
    }
    let msg = JSON.stringify({"username": name.value, "room": room.value, "password": password.value});
    conn.send(msg);
    room.value = "";
    password.value = "";
    name.value = "";
    return false;
};

if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + document.location.host + "/ws");
    conn.onclose = function (evt) {

    };
    conn.onmessage = function (evt) {
        let div = document.createElement("div");
        div.innerHTML = evt.data;
        body.append(div);
    };
} else {

    let item = document.createElement("div");
    item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
    body.append(item);
}

