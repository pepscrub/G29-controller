const robot = require('robotjs');
const io = require("socket.io")(3000);
const child_process = require('child_process');

// Add a connect listener
io.on('connection', client => { 
    console.log('connected');
 });