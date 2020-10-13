var canvas = document.getElementById('main');
var context = canvas.getContext('2d');

var space = {
    "width": canvas.width,
    "height": canvas.height,
    "memory": []
}

var time = {
    "step": 1,
    "current": 0,
    "available": 100000
}

var agents = {
    "count": 100,
    "size": 5,
    "color": "rgba(255, 0, 0, 0.2)",
    "speed": 20,
    "coordinates": {
        "x": [],
        "y": []
    },
    "states": {
        "load": [],
        "direction": []
    }
}

var objects = {
    "count": 200,
    "size": 3,
    "color": "green",
    "broadcast": 20,
    "coordinates": {
        "x": [],
        "y": []
    },
    "states": {
        "picked": []
    }
}

// optional start - better if associated with button
// what about 'pause' button?
init();

// generates random integer between min and max (incl.)
function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// initiates everything
function init() {
    // randomly distribute agents
    for (var i = 0; i < agents.count; i++) {
        // produce coordinates and directions
        agents.coordinates.x[i] = randBetween(0, space.width);
        agents.coordinates.y[i] = randBetween(0, space.height);
        agents.states.direction[i] = Math.random();
        agents.states.load[i] = -1;
    }
    // randomly distribute objects
    for (var i = 0; i < objects.count; i++) {
        // produce coordinates
        objects.coordinates.x[i] = randBetween(0, space.width);
        objects.coordinates.y[i] = randBetween(0, space.height);
        objects.states.picked[i] = -1;
    }
    redraw();
    advance();
}

// clears space and draws agents and objects at given time point
function redraw() {
    // clears the space for redrawing
    context.clearRect(0, 0, space.width, space.height);
    // updates drawing for agents
    for (var i = 0; i < agents.count; i++) {
        context.beginPath();
        context.arc(agents.coordinates.x[i], space.height - agents.coordinates.y[i], agents.size, 0, 2 * Math.PI, false);
        context.fillStyle = agents.color;
        context.fill();
    }
    // updates drawing for objects
    for (var i = 0; i < objects.count; i++) {
        context.beginPath();
        context.arc(objects.coordinates.x[i], space.height - objects.coordinates.y[i], objects.size, 0, 2 * Math.PI, false);
        context.fillStyle = objects.color;
        context.fill();
    }
    emitLight();
}

// chenges the coordinates of a single agent
// takes into account potential out of boundary conflict
function moveAgent(index) {
    var distance = agents.speed * time.step;
    var angle = agents.states.direction[index] * 2 * Math.PI;
    // finds new x coordinate
    agents.coordinates.x[index] += distance * Math.sin(angle);
    if (agents.coordinates.x[index] < 0) {
        agents.coordinates.x[index] = space.width + agents.coordinates.x[index];
    } else if (agents.coordinates.x[index] >= space.width) {
        agents.coordinates.x[index] = agents.coordinates.x[index] - space.width;
    }
    // finds new y coordinate
    agents.coordinates.y[index] += distance * Math.cos(angle);
    if (agents.coordinates.y[index] < 0) {
        agents.coordinates.y[index] = space.height + agents.coordinates.y[index];
    } else if (agents.coordinates.y[index] >= space.height) {
        agents.coordinates.y[index] = agents.coordinates.y[index] - space.height;
    }
    // with a slight chance updates object's direction
    if (time.current % randBetween(0, 100) == 0) { // very meta
        agents.states.direction[index] = Math.random();
    }
}

// advances time one step forward
function advance() {
    // calculate new coordinates for all agents
    for (var i = 0; i < agents.count; i++) {
        // move each agent a certain distance in certain direction
        moveAgent(i);
        // pick(i);
        carry(i);
        // drop(i);
        if (time.current % 17 === 0) {
            pick(i);
        } else if (time.current % 7 === 0) {
            drop(i);
        }
    }
    // redraw space at next time step
    redraw();
    // if there's still time available, advance animation
    if (time.current < time.available) {
        window.requestAnimationFrame(advance);
        time.current += time.step;
    }
}

// updates memory
function emitLight() {
    // initialize space memory
    // for each x
    for (var i = 0; i < space.width; i++) {
        space.memory[i] = [];
        // and for each y
        for (var j = 0; j < space.height; j++) {
            space.memory[i][j] = [];
        }
    }
    // objects emit some energy around themselves
    for (var i = 0; i < objects.count; i++) {
        // we use inverse square law and emit dots around object
        // for radius
        for (var j = 1; j < objects.broadcast; j += 0.5) {
            // for perimeter
            for (var k = 0; k < 1; k += 0.02) {
                var angle = k * 2 * Math.PI;
                var x = Math.round(objects.coordinates.x[i] + j * Math.sin(angle));
                if (x < 0) {
                    x = space.width + x;
                } else if (x >= space.width) {
                    x = x - space.width;
                }
                var y = Math.round(objects.coordinates.y[i] + j * Math.cos(angle));
                if (y < 0) {
                    y = space.height + y;
                } else if (y >= space.height) {
                    y = y - space.height;
                }
                space.memory[x][y][space.memory[x][y].length] = i;
            }
        }
    }
}

// counts number of objects in agent's proximity
// every object broadcasts its presence by emitting light
// every agent measures the intensity at agent's location
// depending on light's intensity agent knows how many unique objects are in proximity
function countObjects(index) {
    // see where current agent is
    var x = Math.round(agents.coordinates.x[index]);
    if (x < 0) {
        x = space.width + x;
    } else if (x >= space.width) {
        x = x - space.width;
    }
    var y = Math.round(agents.coordinates.y[index]);
    if (y < 0) {
        y = space.height + y;
    } else if (y >= space.height) {
        y = y - space.height;
    }
    // see whose emitted light reaches this location
    var energy = space.memory[x][y];
    // separate received light into unique frequencies
    var uniqueObjects = {};
    for (var i = 0; i < energy.length; i++) {
        uniqueObjects[energy[i]] = 1 + (uniqueObjects[energy[i]] || 0);
    }
    // count number of unique frequencies
    return Object.keys(uniqueObjects).length;
}

// finds object which is closest to current agent
// as more of its unique light reaches current agent's location
function findClosest(index) {
    // see where current agent is
    var x = Math.round(agents.coordinates.x[index]);
    if (x < 0) {
        x = space.width + x;
    } else if (x >= space.width) {
        x = x - space.width;
    }
    var y = Math.round(agents.coordinates.y[index]);
    if (y < 0) {
        y = space.height + y;
    } else if (y >= space.height) {
        y = y - space.height;
    }
    // see whose emitted light reaches this location
    var energy = space.memory[x][y];
    // separate received light into unique frequencies
    var uniqueObjects = {};
    for (var i = 0; i < energy.length; i++) {
        uniqueObjects[energy[i]] = 1 + (uniqueObjects[energy[i]] || 0);
    }
    //
    var highestIntensity = -1;
    var closestObject = -1;
    for (var i = 0; i < Object.keys(uniqueObjects).length; i++) {
        if (highestIntensity < uniqueObjects[Object.keys(uniqueObjects)[i]]) {
            highestIntensity = uniqueObjects[Object.keys(uniqueObjects)[i]];
            closestObject = Object.keys(uniqueObjects)[i];
        }
    }
    return 1 * closestObject;
}

function pick(index) {
    var objectCount = countObjects(index);
    var closestObject = findClosest(index);
    if (agents.states.load[index] < 0) {
        if (objectCount > 0) {
            var randomNumber = Math.random();
            if (randomNumber < (0.25 - (objectCount / objects.count))) { // 1 or lower
                objects.coordinates.x[closestObject] = agents.coordinates.x[index];
                objects.coordinates.y[closestObject] = agents.coordinates.y[index];
                objects.states.picked[closestObject] = index;
                agents.states.load[index] = closestObject;
                console.log(index + " picked " + closestObject);
            }
        }
    }
}

function drop(index) {
    var objectCount = countObjects(index);
    if (agents.states.load[index] > -1) {
        if (objectCount > 1) {
            var randomNumber = Math.random();
            if (randomNumber < (0.75 + (objectCount / objects.count))) { // 0 or higher
                objects.coordinates.x[agents.states.load[index]] = agents.coordinates.x[index];
                objects.coordinates.y[agents.states.load[index]] = agents.coordinates.y[index];
                objects.states.picked[agents.states.load[index]] = -1;
                console.log(index + " dropped " + agents.states.load[index]);
                agents.states.load[index] = -1;
            }
        }
    }
}

function carry(index) {
    if (agents.states.load[index] > -1) {
        objects.coordinates.x[agents.states.load[index]] = agents.coordinates.x[index];
        objects.coordinates.y[agents.states.load[index]] = agents.coordinates.y[index];
    }
}

// real issues:
// + slow compute due to how agent vision works
// + drop > instant pick bc of how pick & drop probability is calculated
