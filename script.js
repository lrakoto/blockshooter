// Main event listener
window.addEventListener('DOMContentLoaded', function() {
        // Grab DOM Elements
        const gameCanvas = document.querySelector('#gamecanvas');
        const scoreBoard = document.querySelector('#score');
        const lives = document.querySelector('#lives');
        const health = document.querySelector('#health');
        const weapons = document.querySelector('#weapons');
        const turret = document.querySelector('#turret');
        const ctx = gameCanvas.getContext('2d');
        let score = 0;
        let xCoords = [];
        let yCoords = [];
        let cursorPosX;
        let cursorPosY;
        let playerTurret;
        let difficulty = 2500;
        let enemyCoords = {};

        // Canvas Setup
        gameCanvas.setAttribute('height', getComputedStyle(gameCanvas)['height']);
        gameCanvas.setAttribute('width', getComputedStyle(gameCanvas)['width']);
        let canvasWidth = parseInt(getComputedStyle(gameCanvas)['width']);
        let canvasHeight = parseInt(getComputedStyle(gameCanvas)['height']);

        // Add cancas event listeners
        gameCanvas.addEventListener('mousemove', function (e) {
            findxy('move', e)
        }, false);
        gameCanvas.addEventListener('mousedown', function (e) {
            findxy('down', e)
        }, false);
        gameCanvas.addEventListener('mouseup', function (e) {
            findxy('up', e)
        }, false);
        gameCanvas.addEventListener('mouseout', function (e) {
            findxy('out', e)
        }, false);

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
                    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
                }
            }
        }
        class Enemy extends Player {
            constructor(x, y, color, width, height, health, scoreValue) {
                super(x, y, color, width, height, health);
                this.scoreValue = scoreValue;
                this.render = function() {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, width, height);
                }
                
            }
        }

        // Create new class instances
        playerTurret = new Player((canvasWidth/2) - 25, (canvasHeight/2) - 25, 'black', 50, 50, 100);

        // New enemy function
        function addCoords () {
            xCoords.push(Math.floor(Math.random() * gameCanvas.width) - 15);
            yCoords.push(Math.floor(Math.random() * gameCanvas.height) - 15);
        }
        this.setInterval(addCoords, difficulty);
        // function setDifficulty(){
        //     difficulty = difficulty -= 10;
        //     console.log(difficulty);
        //     this.setInterval(addCoords, difficulty);
        // }
        // this.setInterval(setDifficulty, 3000);        

        function spawnNewEnemy() {
            function drawLoop(x, y) {
                ctx.fillRect((x - 7), (y - 7), 15, 15);
                ctx.fillStyle = 'red';
            }
            xCoords.forEach((currentValue, arrayIndex) => {
                drawLoop(currentValue, yCoords[arrayIndex]);
            });
        }

        // Enemy movement 
        function moveEnemy () {
            for(i = 0; i < xCoords.length; i++) {
                let storedValueX = xCoords[i];
                let storedValueY = yCoords[i];
                let point = {X: storedValueX, Y: storedValueY};
                let target = {X:canvasWidth/2, Y:canvasHeight/2};
                let angle = Math.atan2(target.Y - point.Y, target.X - point.X);
                let perFrameDistance = 2;
                let sin = Math.sin(angle) * perFrameDistance;
                let cos = Math.cos(angle) * perFrameDistance;
                xCoords.splice(i, 1);
                xCoords.splice(i, 0, storedValueX += cos);
                yCoords.splice(i, 1);
                yCoords.splice(i, 0, storedValueY += sin);
            }
        }
        this.setInterval(moveEnemy, 500);

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

        // Turret Barrel target function
        function turretTarget(ctx, pointX, pointY) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pointX, pointY, 20, 0, 2 * Math.PI);
            ctx.stroke();        
        }
        
        // Stationary turret and target function
        function findxy(action, event) {
            if (action == 'move') {
                cursorPosX = event.clientX - gameCanvas.offsetLeft;
                cursorPosY = event.clientY - gameCanvas.offsetTop;
            }
        }

        // Turret Fire Action
        gameCanvas.addEventListener("mousedown", fireAction);
        function fireAction (event) {
            function fireLoop(){
                ctx.beginPath();
                ctx.moveTo(canvasWidth/2, canvasHeight/2);
                ctx.lineTo(cursorPosX, cursorPosY);
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 1;
                ctx.stroke();
                turretBarrel(canvasWidth/2, canvasHeight/2, cursorPosX, cursorPosY, 50);
            }
            function stopLoop(){
                clearInterval(fireInterval);
            }
            const fireInterval = setInterval(fireLoop, 10);
            setTimeout(stopLoop, 50);
            
            // gameCanvas.addEventListener("mouseup", stopLoop);
            xCoords.forEach((value, index) => {
                let rules = 
                event.offsetX >= (value - 8) && 
                event.offsetX <= (value + 8) &&
                event.offsetY >= (yCoords[index] - 8) &&
                event.offsetY <= (yCoords[index] + 8)
                ;
                if(rules) {
                    xCoords.forEach((value, index, arr) => {
                        if(event.offsetX >= (value - 4) && event.offsetX <= (value + 4) && event.offsetY >= (yCoords[index] - 4) && event.offsetY <= (yCoords[index] + 4)) {
                            arr[arr.indexOf(value)] = 30000;
                        }
                    });
                    yCoords.forEach((value, index, arr) => {
                        if(event.offsetY >= (yCoords[index] - 4) && event.offsetY <= (yCoords[index] + 4) && event.offsetX >= (value - 4) && event.offsetX <= (value + 4) && event.offsetY >= (yCoords[index] - 4)) {
                            arr[arr.indexOf(value)] = 30000;
                        }
                    });
                    score = score += 100;
                    scoreBoard.textContent = score;
                }
            })
        }

        // Game loop function
        function gameLoop(){
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            playerTurret.render();
            turretBarrel(canvasWidth/2, canvasHeight/2, cursorPosX, cursorPosY, 50);
            turretTarget(ctx, cursorPosX, cursorPosY);
            spawnNewEnemy();   
        }

        // Call game loop
        const runGame = this.setInterval(gameLoop, 30);
    }

)