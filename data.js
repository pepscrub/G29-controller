const {controller} = require('./G920');

function data(data)
{
    if(process.argv[2] == 'debug') console.time('data loop')
    const DB = data[1]; // DPAD + X,B,Y,A
    const SP = data[2]; // Other wheel buttons (contains reverse gear)
    const GB = data[3]; // Gearbox 0-6
    const WA = data[4]; // For every 1 WH 0-255 WA's occur
    const WH = data[5]; // Wheel
    const AP = data[6]; // Accelerator Pedal (0 is fully engaged)
    const BP = data[7]; // Brake (0 is fully engaged)
    const CP = data[8]; // Clutch (0 is fully engaged)
    const dataJSON = [
        DB,
        SP,
        GB,
        WA,
        WH,
        AP,
        BP,
        CP
    ];
    if(GB == 16) // 5th gear;
    {
        controller.failsafe = true;
        controller.modifiers['wheel'] = 0;
        return;
    }
    controller.failsafe = false;
    controller.reverse = false;
    controller.buffer = dataJSON;
    
    controller.keypresses();
    if(process.argv[2] == 'debug') console.timeEnd('data loop')
    controller.mouseCalculation();
}


module.exports.data = data;