const HID = require('node-hid');

// const express = require('express');
// const app = express();
// const cookieParser = require('cookie-parser');
// const expressWs = require('express-ws')(app);
const chalk = require('chalk');

const {options, games} = require('./options');
const {controller} = require('./G920');
const {data} = require('./data');

const op = new options();
const supported = new games();


let device = '';
function startup()
{
    console.clear();
    console.log(chalk.green.bold(`G920`) + ` Starting up.`)
    device = new HID.HID(controller.findWheel());

    device.on('error', err=>
    {
        console.error(chalk.bold.red('ERROR') + ` ${e.message}\n${err.stack}`);
    })

    // Updates even if the values are the same
    device.setNonBlocking(1); 
    device.on('data', data);
    setInterval(() => {controller.loop()}, 2);
}

startup();


module.exports = 
{
    op,supported
}