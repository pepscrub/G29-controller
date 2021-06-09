const HID = require('node-hid');
const chalk = require('chalk');
const robot = require('robotjs');

const tmp = require('./options').options;
const op = new tmp();

const devices = HID.devices();
const io = require("socket.io-client");
let socket = io.connect('http://localhost:3000', {reconnect: true});


robot.setMouseDelay(1);
robot.setKeyboardDelay(1);

class G920
{
    // Ignore input from wheel when true
    failsafe = false;
    // Select W or S
    reverse = false;
    helddown = 0;

    // For wheel calc
    convertion = op.range / 255;

    // Device stream → formatting → buffer
    buffer = [];
    device = ''; // Init device

    // Keys for loop (runs every X ms)
    modifiers =
    {
        up: false,          // ↑ DPAD move cursor up     
        down: false,        // ↓ DPAD move cursor down
        right: false,       // → DPAD move cursor right
        left: false,        // ← DPAD move cursor left

        walk: false,        // Holding key down (w /s)
        crouch: false,
        sprint: false,


        scroll: 0,
        scrollpressed: false,
        scrollup: false,     // Increase Scroll 
        scrolldwn: false,     // Decrease Scroll 
        crouchup: false,
        sprintup: false,

        shiftup: false,
        shiftdwn: false,

        keydown: false,     // Keydown (w / s)
        brakedown: false,   // Brake reached threshhold
        clutchdown: false,  // Clutch reached threshhold                           

        wheel: 0,
        xm: 0,               // X position of cursor   
        ym: 0,               // Y position of cursor
        num: 0,             // Scroll through hotbar
        pk: 'w'             // Previous key
    }

    findWheel()
    {
        // Init with empty path to check later.
        console.time('found in');
        let path = '';
        try
        {
            let i = 0;
            this.logLine(chalk.blue.bold(`Searching ... `))
            // Big-O: O(n)
            // Reads the USB devices on the computer
            // worst case: G29 is the last device
            // best case: G29 is the first device
            // average case: G29 is around the middle
            devices.forEach(device=>
            {
                this.logLine(chalk.blue.bold(`Searching ... ${device.product}`))
                if(path != '') return;
                if( 
                    device.vendorId === 1133 && 
                    device.productId === 49762 &&
                    device.usagePage === 1
                    )
                {
                    // Update path to G29
                    path = device.path;
                }
                i++;
            })
            }catch(e)
            {
                this.resetLog();
                console.error(`${chalk.bold.redBright('ERROR')} Something happened!\n${e.message}\n${e.stack}`);
            }

            if(path === '')
            {
                this.resetLog();
                console.log(`${chalk.bold.redBright('ERROR')} ${chalk.grey('Could not find Logitech G29')}`);
                console.log(`${chalk.italic.gray('Check to see if the Logitech G software is open.')}`);
                console.log(`${chalk.italic.gray('Did you plug it in?')}`);
                process.exit(-1);
            }
            else
            {
                this.logLine(chalk.blue.bold(`Searching ... `));
                console.timeEnd('found in');
                return path;
            }
    }

    // X key presses
    // WBIN ← Buffer data
    x(WBIN)
    {
        switch(WBIN)
        {
            case 3: case 2: case 1: // RIGHT
                this.modifiers['left'] = false;
                this.modifiers['right'] = true;
            break;
            case 7: case 6: case 5: // Left
                this.modifiers['right'] = false;
                this.modifiers['left'] = true;
            break;
            default: // If neither are are pressed
                this.modifiers['right'] = false;
                this.modifiers['left'] = false;
            break;
        }
    }

    // Y key presses
    // WBIN ← Buffer data
    y(WBIN)
    {
        switch(WBIN)
        {
            case 7: case 1: case 0: // Up
                this.modifiers['down'] = false;
                this.modifiers['up'] = true;
            break;
            case 5: case 4: case 3: // Down
                this.modifiers['up'] = false;
                this.modifiers['down'] = true;
            break;
            default:
                this.modifiers['down'] = false;
                this.modifiers['up'] = false;
            break;
        }
    }

    keypresses()
    {
        const {DB,SP,GB,WA,WH,AP,BP,CP} = this.buffer;
        const buffer = this.buffer;
        const scroll = this.modifiers.scroll;
        // Gearbox Shift + Sprinting
        switch(buffer[2])
        {
            case 1:
                this.modifiers.crouch = true;
            break;
            case 2:
                this.modifiers.sprint = true;
            break;
            case 4:
                this.modifiers.scrollup = true;
            break;
            case 8:
                this.modifiers.scrolldwn = true;
            break;
            default:
                this.modifiers.scrollpressed = false;
                this.modifiers.scrollup = false;
                this.modifiers.scrolldwn = false;
                this.modifiers.crouch = false;
                this.modifiers.sprint = false;
            break;
        }



        // In reverse gear (press S instead of W)
        if(buffer[1] == 128) this.reverse = true;
        
        // Handling walking input
        // Accelator pedal is slightly pushed down
        if(buffer[5] < 200)this.modifiers.walk = true
        else this.modifiers.walk = false
        // Brake down (scrolling)

        if(buffer[6] < 200)
            this.modifiers['brakedown'] = true;
        else
            this.modifiers['brakedown'] = false;
        
        if(buffer[7] < 200)
            this.modifiers['clutchdown'] = true;
        else
            this.modifiers['clutchdown'] = false;
    }

    // really is wheel caclulation
    // Will spit out the range / 2 as either
    // + on full lock right
    // - on full lock left
    // defaults to 0 when centered
    // This operation can take up to .1ms
    // should look at a good way to optimize it.
    mouseCalculation()
    {
        if(process.argv[2] == 'debug') console.time('Mouse Calculation')
        const WT = this.buffer[4];
        const WH = this.buffer[3];
        const convertion = op.range / 255; // convert into 0-255 float
        
        const aprroxVal = WT * convertion; // updates to range


        const accurate = aprroxVal + (WH / 64); // Updating with WT
        const xCalc = parseFloat(accurate.toFixed(op.accuracy));
        const middle = (op.range / 2) + ((WH /64) /2);
        const out = xCalc - middle;
        this.modifiers['wheel'] = out;

        this.x(this.buffer[0]);
        this.y(this.buffer[0]);
        // this.logLine(`${Math.floor(out%40)}`);

        if(process.argv[2] == 'debug') console.timeEnd('Mouse Calculation')
    }

    // Socket
    // using sockets to handle all of our movement
    // since we want this event loop to run ***FAST***
    serverSocket()
    {
        // Connect to the socket
        socket.on('connect', function (socket) {
            console.log(chalk.bold.cyan('Socket'), 'connected')
        });
    }


    loop()
    {
        if(process.argv[2] == 'debug') console.time('Main loop')
        if(this.failsafe) return;

        // Can't expldoe the modifies for some reason.
        let {x,y} = robot.getMousePos();
        let up = this.modifiers.up;
        let down = this.modifiers.down;
        let left = this.modifiers.left;
        let right = this.modifiers.right;
        let walk = this.modifiers.walk;
        let crouch = this.modifiers.crouch;
        let crouchup = this.modifiers.crouchup;
        let keydown = this.modifiers.keydown;
        let brakedown = this.modifiers.brakedown;
        let clutchdown = this.modifiers.clutchdown;
        let shiftdwn = this.modifiers.shiftdwn;
        let shiftup = this.modifiers.shiftup;
        let sprint = this.modifiers.sprint;
        let sprintup = this.modifiers.sprintup;

        let scroll = this.modifiers.scroll;
        let scrollup = this.modifiers.scrollup;
        let scrolldwn = this.modifiers.scrolldwn;
        let scrollpressed = this.modifiers.scrollpressed;


        x += this.modifiers.wheel;

        if(up)
            y-=op.pixelshift;
        if(down)
            y+=op.pixelshift;
        if(right)
            x+=op.pixelshift;
        if(left)
            x-=op.pixelshift;

        if(!up&&!down&&!right&&left)
            this.helddown = 0;
        else
            this.helddown = this.helddown > 25 ? this.helddown : this.helddown += 2;

        // Scrolling up using brake
        if(brakedown)
            y-=((255-this.buffer[6])/10);
        // Scrolling down using clutch
        if(clutchdown)
            y+=((255-this.buffer[7])/10);

        robot.moveMouse(x,y+1);

        // Current key
        let key = this.reverse ? 's' : 'w';


        // Shifting
        if(crouch)
        {
            if(!crouchup)
            {
                this.modifiers.crouchup = true;
                toggle('shift', 'down') 
            }
        }
        else
        {
            if(crouchup)
            {
                this.modifiers.crouchup = false;
                toggle('shift', 'up') 
            }
        }


        // Sprinting
        if(sprint)
        {
            if(!sprintup)
            {
                this.modifiers.sprintup = true;
                toggle('control', 'down')
            }
        }
        else
        {
            if(sprintup)
            {
                this.modifiers.sprintup = false;
                toggle('control', 'up')
            }
        }
  
        if(!scrollpressed)
        {
            if(scrollup)
            {
                this.modifiers.scrollpressed = true;
                this.modifiers.scrollup = false;

                scroll >= 9 ? this.modifiers.scroll = 1 : this.modifiers.scroll+=1;
                socket.emit('keytap', {value: this.modifiers.scroll})
            }
            else if(scrolldwn)
            {
                this.modifiers.scrollpressed = true;
                this.modifiers.scrolldwn = false;

                scroll <= 1 ? this.modifiers.scroll = 9 : this.modifiers.scroll-=1;
                socket.emit('keytap', {value: this.modifiers.scroll})
            }
        }


        // Walking logic
        // 
        if(walk)
        {
            if(!keydown)
            {
                this.modifiers['keydown'] = true;
                this.modifiers['pk'] = key;

                toggle(key, 'down') 
            }
        }else{
            if(keydown)
            {
                this.modifiers['keydown'] = false;
                let key = this.modifiers['pk'];

                toggle(key, 'up') 
            }
        }

        this.modifiers.xm = x;
        this.modifiers.ym = y;

        if(process.argv[2] == 'debug') 
        {
            console.clear();
            console.timeEnd('Main loop')
        }
    } 

    // helpers
    logLine(message)
    {
        this.resetLog();
        process.stdout.write(message);
    }

    resetLog()
    {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
    }

    disconnect()
    {
        socket.emit('exit');
        socket.close();
        // socket.disconnect('exit');
    }
}

function toggle(key, updwn)
{
    socket.emit('keytoggle', {key: key, type: updwn})
}

module.exports.controller = new G920();