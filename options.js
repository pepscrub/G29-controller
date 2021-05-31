class options {
    accuracy = 0;
    debug = false;
    pixelshift = 0;
    range = 0;
    updatetime = 0;
    constructor(accuracy=1, debug=false, pixelshift=15, range=400,updatetime=15)
    {
        this.accuracy = accuracy;
        this.debug = debug;
        this.pixelshift = pixelshift;
        this.range = range;
        this.updatetime = updatetime;
    }
}


class games {
    minecraft = [0,0];
}


module.exports.options = options;
module.exports.games = games;
