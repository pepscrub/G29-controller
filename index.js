const HID = require('node-hid');

// const express = require('express');
// const app = express();
// const cookieParser = require('cookie-parser');
// const expressWs = require('express-ws')(app);
const chalk = require('chalk');
const child_process = require('child_process');

const {options, games} = require('./options');
const {controller} = require('./G920');
const {data} = require('./data');

const op = new options();
const supported = new games();


let device = '';
function startup()
{
    // console.clear();
    console.log(chalk.green.bold(`G920`) + ` App starting up.`)
    controller.serverSocket();
    device = new HID.HID(controller.findWheel());

    device.on('error', err=>
    {
        console.error(chalk.bold.red('ERROR') + ` ${err.message}\n${err.stack}`);
    })
    
    // Completely seperate process
    // -- immedite exit code when started
    const child = child_process.exec(`start cmd.exe /K node events.js`);
    
    // Updates even if the values are the same
    let countdown = 5;

    if(process.argv['2'] == 'debug') countdown = 0;

    let timer = setInterval(() => {
        if(countdown == 0)
        {
            controller.logLine(`${chalk.bold.yellow('Starting controller')}\n`)
            clearInterval(timer);
            startcontroller();
            return;
        }
        else
        {
            controller.logLine(`${chalk.bold.yellow('Starting in:')} ${countdown}`)
        }

        countdown--;
    }, 1000); 
}

function startcontroller()
{
    device.setNonBlocking(1); 
    device.on('data', data);
    setInterval(() => {controller.loop()}, 3);
}
startup();


module.exports = 
{
    op,supported
}