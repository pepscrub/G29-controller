const HID = require('node-hid');
const chalk = require('chalk');
const devices = HID.devices();

class G29
{
    // Select W or S
    reverse = false
    helddown = 0;

    // Device stream → formatting → buffer
    buffer = [0x01, 0x08, 0x00, 0x00, 0x21, 0x80, 0xff, 0xff, 0xff, 0x07];
    device = ''; // Init device

    // Keys for loop (runs every X ms)
    keys =
    {
        up: false,          // ↑ DPAD move cursor up     
        down: false,        // ↓ DPAD move cursor down
        right: false,       // → DPAD move cursor right
        left: false,        // ← DPAD move cursor left

        walk: false,        // Holding key down (w /s)

        shiftup: false,     // Increase Scroll 

        keydown: false,     // Keydown (w / s)
        brakedown: false,   // Brake reached threshhold
        clutchdown: false,  // Clutch reached threshhold                           

        x: 0,               // X position of cursor   
        y: 0,               // Y position of cursor
        num: 0,             // Scroll through hotbar
        pk: 'w'             // Previous key
    }

    // Memory buffer from device
    membuff = 
    {
        DP: 8,      // DPAD + XBOX Buttons
        SP: 0,      // SHIFTER PEDALS + XBOX Home Button + Reverse Gear ??
        GB: 0,      // GEARBOX
        WA: 0,      // WHEEL ACCURACY (Floating point of every 1 of WH)
        WT: 128,    // WHEEL TURN (128 Center)
        AP: 255,    // ACCEL PEDAL
        BP: 255,    // BRAKE PEDAL
        CP: 255,    // CLUTCH PEDAL
        wheel:
        {
            curr: 0,
        }
    }

    findWheel()
    {
        // Init with empty path to check later.
        let path = '';
        try
        {
            // Big-O: O(n)
            // Reads the USB devices on the computer
            // worst case: G29 is the last device
            // best case: G29 is the first device
            // average case: G29 is around the middle
            devices.forEach(device=>
            {
                if( 
                    device.vendorId === 1133 && 
                    device.productId === 49762 &&
                    device.usagePage === 1
                    )
                {
                    // Update path to G29
                    path = device.path;
                }
            })
        }catch(e)
        {
            console.error(`${chalk.bold.redBright('ERROR')} Something happened!\n${e.message}\n${e.stack}`);
        }
        if(path === '')
            console.log(`${chalk.bold.redBright('ERROR')} ${chalk.grey('Could not find Logitech G29')}`),
            console.log(`${chalk.italic.gray('Did you plug it in?')}`),
            process.exit(-1);
        else
            return path;
    }

    // X key presses
    // WBIN ← Buffer data
    x(WBIN)
    {
        switch(WBIN)
        {
            case 2: // RIGHT
                key['left'] = false;
                key['right'] = true;
            break;
            case 6: // Left
                ps['right'] = false;
                ps['left'] = true;
            break;
            default: // If neither are are pressed
                ps['right'] = false;
                ps['left'] = false;
            break;
        }
    }

    // Y key presses
    // WBIN ← Buffer data
    y(WBIN)
    {
        switch(WBIN)
        {
            case 0: // Up
                key['down'] = false;
                ps['up'] = true;
            break;
            case 4: // Down
                key['up'] = false;
                key['down'] = true;
            break;
            default:
                key['down'] = false;
                key['up'] = false;
            break;
        }
    }
}


module.exports.G29 = G29;