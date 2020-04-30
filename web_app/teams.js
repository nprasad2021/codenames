let conn;

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