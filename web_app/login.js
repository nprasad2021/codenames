let conn;
let body = document.querySelector("body");

document.querySelector("form").onsubmit = function () {
    let room = document.querySelector('input[name="room"]');
    let password = document.querySelector('input[name="password"]');
    if (!conn) {
        return false;
    }
    if (!room || !password) {
        return false;
    }
    let msg = JSON.stringify({"room": room.value, "password": password.value});
    conn.send(msg);
    room.value = "";
    password.value = "";
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

