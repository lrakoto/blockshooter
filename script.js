// Grab DOM Elements
const gameCanvas = document.querySelector('#gamecanvas');
const score = document.querySelector('#score');
const lives = document.querySelector('#lives');
const health = document.querySelector('#health');
const weapons = document.querySelector('#weapons');
const turret = document.querySelector('#turret');
const ctx = gameCanvas.getContext('2d');
let playerTurret;

// Canvas Setup
gameCanvas.setAttribute('height', getComputedStyle(gameCanvas)['height']);
gameCanvas.setAttribute('width', getComputedStyle(gameCanvas)['width']);
let canvasWidth = getComputedStyle(gameCanvas)['width'];
let canvasHeight = getComputedStyle(gameCanvas)['height'];
console.log(canvasHeight/2);
console.log(canvasWidth/2);



// Create Classes
class Player {
    constructor(x, y, color, width, height, health) {
        this.x = x;
        this.y = y;
        this.image = turret;
        this.color = color;
        this.width = width;
        this.height = height;
        this.health = health;

        this.render = function() {
            ctx.fillRect(x, y, color, width, height, health)
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }
}

// Event Listeners
window.addEventListener('DOMContentLoaded', function() {
    playerTurret = new Player(canvasHeight/2, canvasWidth/2, 'black', 50, 50, 100);
    const runGame = this.setInterval(gameLoop, 60);
});

// Game Processes
function gameLoop(){
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    playerTurret.render();
}