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
        let cursorPosX = ctx.clientX;
        let playerTurret;
        console.log(cursorPosX);

        // Canvas Setup
        gameCanvas.setAttribute('height', getComputedStyle(gameCanvas)['height']);
        gameCanvas.setAttribute('width', getComputedStyle(gameCanvas)['width']);
        let canvasWidth = parseInt(getComputedStyle(gameCanvas)['width']);
        let canvasHeight = parseInt(getComputedStyle(gameCanvas)['height']);
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
        // Create new Player instance
        playerTurret = new Player((canvasWidth/2) - 25, (canvasHeight/2) - 25, 'black', 50, 50, 100);
       
        // Turret Barrel with Max length
        function turretBarrel (x1, y1, x2, y2, maxLen) {
            var vx = x2 - x1; // get dist between start and end of line
            var vy = y2 - y1; // for x and y
        
            // use pythagoras to get line total length
            var mag = Math.sqrt(vx * vx + vy * vy); 
            if (mag > maxLen) { // is the line longer than needed?
        
                // calculate how much to scale the line to get the correct distance
                mag = maxLen / mag;
                vx *= mag;
                vy *= mag; 
            }
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + vx, y1 + vy);
            ctx.stroke();
        }

        // Turret Barrel function
        function turretTarget(ctx, pointX, pointY) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pointX, pointY, 20, 0, 2 * Math.PI);
            ctx.stroke();        
        }
        
        // Draw turret barrel
        gameCanvas.addEventListener("mousemove", function(event){
            turretBarrel(canvasWidth/2, canvasHeight/2, event.offsetX, event.offsetY, 50);
            turretTarget(ctx, event.offsetX, event.offsetY);
        });
        // gameCanvas.addEventListener("mousemove", function(event){
        //     turretBarrel(ctx, event.offsetX, event.offsetY);
        //     ctx.beginPath();
        //     ctx.moveTo(canvasWidth/2, canvasHeight/2);
        //     ctx.lineTo(((canvasWidth/2) + event.offsetX)/2, ((canvasHeight/2) + event.offsetY)/2);
        //     ctx.strokeStyle = 'black';
        //     ctx.stroke(); // #434554
        // });

        // Game loop function
        function gameLoop(){
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            playerTurret.render();
        }

        // Call game loop
        const runGame = this.setInterval(gameLoop, 60);
    }

)