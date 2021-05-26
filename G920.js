const HID = require('node-hid');
const chalk = require('chalk');
const robot = require('robotjs');
const tmp = require('./options').options;
const op = new tmp();

const devices = HID.devices();


robot.setMouseDelay(1);

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


        scroll: 0,
        scrollup: false,     // Increase Scroll 
        scrolldwn: false,     // Decrease Scroll 
        crouchup: false,

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
        console.time('found');
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
                console.timeEnd('found');
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


        this.logLine(`Buffer: ${buffer[1]}`);
        // Gearbox Shift + Sprinting
        switch(buffer[2])
        {
            case 1:
                robot.keyToggle('shift', 'down');
                robot.keyToggle('shift', 'up');
            break;
            case 2:
                robot.keyToggle('control', 'down');
                robot.keyToggle('control', 'up');
            break;
        }

        // In reverse gear (press S instead of W)
        if(buffer[1] == 128) this.reverse = true;

        // Handling walking input
        // Accelator pedal is slightly pushed down
        if(buffer[3] < 200) this.modifiers['walk'] = true;
        else
        {
            // Update the pressed down key to be released
            if(this.modifiers['keydown'])
                robot.keyToggle(this.modifiers['pk'], 'up');
            // Update other attributes to reflect modifications
            this.modifiers['keydown'] = false;
            this.modifiers['walk'] = false;
        }

        // Brake down (scrolling)

        if(buffer[4] < 200)
        {
            this.modifiers['brakedown'] = true;
        }
        else
        {
            this.modifiers['brakedown'] = false;
            this.modifiers['scrollup'] = false;
        }
        
        if(buffer[5] < 200)
        {
            this.modifiers['clutchdown'] = true;
        }
        else
        {
            this.modifiers['clutchdown'] = false;
            this.modifiers['scrolldwn'] = false;
        }
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

    loop()
    {
        if(process.argv[2] == 'debug') console.time('Main loop')
        if(this.failsafe) return;

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

        robot.moveMouse(x,y+1);

        // Current key
        let key = this.reverse ? 's' : 'w';


        // Shifting
        if(crouch)
        {
            if(crouchup)
            {
                this.modifiers.crouchup = true;
                robot.keyToggle('shift', 'down');
            }
        }
        else
        {
            if(crouchup)
            {
                robot.keyToggle('shift', 'up');
            }
        }

        // Walking forward / backwards
        if(walk)
        {
            if(!keydown)
            {
                this.modifiers.pk = key;
                this.keydown = true;
                robot.keyToggle(key, 'down');
            }
        }else{
            if(keydown)
            {
               robot.keyToggle(key, 'up');
            }
        }

        // Scrolling up using brake
        if(brakedown)
        {
            if(!shiftup)
            {
                this.modifiers.shiftup = true;
                this.modifiers.scroll+1 > 9 ? this.modifiers.scroll = 0 : this.modifiers.scroll += 1;
                robot.keyTap(this.modifiers.scroll);
            }
        }


        if(clutchdown)
        {
            if(!shiftdwn)
            {
                this.modifiers.shiftdwn = true;
                this.modifiers.scroll-1 <= 9 ? this.modifiers.scroll = 9 : this.modifiers.scroll -= 1;
                robot.keyTap(this.modifiers.scroll);
            }
        }

        this.modifiers.xm = x;
        this.modifiers.ym = y;
        if(process.argv[2] == 'debug') console.timeEnd('Main loop')
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
}


module.exports.controller = new G920();