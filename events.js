const robot = require('robotjs');
const io = require("socket.io")(3000);

robot.setMouseDelay(1);
robot.setKeyboardDelay(1);

// Add a connect listener
io.on('connection', socket => { 
    // Handling keytoggles (w/s)
    socket.on('keytoggle', (msg)=>
    {
        robot.keyToggle(msg['key'], msg['type'])
        console.log(msg)
    })

    socket.on('keytap', (msg)=>
    {
        robot.keyTap(msg['value'])
        console.log(msg)
    })
    
    socket.on('exit', (msg)=>
    {
        process.exit();
    })

    // Deprecated
    // Lags this process (15ms polling rate required due to)
    // .moveMouse anyways so we'd just re-introduce the
    // bug where mouse movement gets interrupted by
    // keytoggling
    // ----------------------------------------------------
    // socket.on('moveMouse', (msg)=>
    // {
    //     const {x,y} = msg;
    //     robot.moveMouse(msg['x'], msg['y']);
    //     console.clear();
    //     console.log(`x: ${x} y ${y}`);
    // })
});


