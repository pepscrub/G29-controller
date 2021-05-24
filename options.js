class options {
    accuracy = 1;
    debug = false;
    pixelshift = 1;
    range = 400
    constructor(accuracy, debug, pixelshift, range)
    {
        this.accuracy = accuracy;
        this.debug = debug;
        this.pixelshift = pixelshift;
        this.range = range;
    }
}


class games {
    minecraft = [0,0];
}


module.exports.options = options;
module.exports.games = games;
