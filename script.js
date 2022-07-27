// Main event listener
window.addEventListener('DOMContentLoaded', function() {
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
        let canvasWidth = parseInt(getComputedStyle(gameCanvas)['width'])/2;
        let canvasHeight = parseInt(getComputedStyle(gameCanvas)['height'])/2;
        const turretWidth = 50;
        const turretHeight = 50;
        console.log(canvasHeight);
        console.log(canvasWidth);

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



        playerTurret = new Player((canvasWidth-25), (canvasHeight-25), 'black', 50, 50, 100);
        function mouseTrack(ctx, pointX, pointY) {
            ctx.fillStyle = 'green';
            ctx.stokeStyle = 'blue';
            ctx.lineWidth = 1;
            ctx.fillRect(pointX, pointY, 24, 24);
            ctx.strokeRect(pointX, pointY, 24, 24);
        }
        gameCanvas.addEventListener("mousemove", function(event){
            mouseTrack(ctx, event.offsetX, event.offsetY)
        });
        const runGame = this.setInterval(gameLoop, 60);


        // Game Processes
        function gameLoop(){
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            playerTurret.render();
        }
    }

)