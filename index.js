const robot = require('robotjs');
const HID = require('node-hid');

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const expressWs = require('express-ws')(app);

const {options, games} = require('./options');

const {G29} = require('./G29');
const controller = new G29();
const op = new options();
const supported = new games();


let device = '';
function startup()
{
    const WHEEL_convert = op.range / 255; // buff reads 0 → 255
    device = new HID.HID(controller.findWheel());
}


startup();