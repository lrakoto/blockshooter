// Main event listener
    window.addEventListener('DOMContentLoaded', function() {
        // Grab DOM Elements
        const gameCanvas = document.querySelector('#gamecanvas');
        const startMenu = document.querySelector('#startmenu');
        const winMenu = document.querySelector('#winmenu');
        const loseMenu = document.querySelector('#losemenu');
        const returnMenuWin = document.querySelector('#returntomenuwin');
        const returnMenuLose = document.querySelector('#returntomenulose');
        const resetWin = document.querySelector('#resetwin');
        const resetLose = document.querySelector('#resetlose');
        const topBar = document.querySelector('#topbar');
        const bottomBar = document.querySelector('#bottombar');
        const healthText = document.querySelector('#healthtext');
        const scoreBoard = document.querySelector('#score');
        const startButton = document.querySelector('#startbutton');
        const livesText = document.querySelector('#lives');
        const healthBar = document.querySelector('#health');
        const turret = document.querySelector('#turret');
        const ctx = gameCanvas.getContext('2d');
        const laserSound = document.querySelector('#laser');
        let gameStartInt;
        let score = 0;
        let health = 100;
        let lives = 3;
        let xCoords = [];
        let yCoords = [];
        let cursorPosX;
        let cursorPosY;
        let playerTurret;
        let difficulty = 1000;
        let perFrameDistance = .1;

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

        // Create player class instance
        playerTurret = new Player((canvasWidth/2) - 25, (canvasHeight/2) - 25, 'black', 50, 50, 100);

        // New enemy function
        function addCoords () {
            xCoords.push(Math.floor(Math.random() * gameCanvas.width) - 15);
            yCoords.push(Math.floor(Math.random() * gameCanvas.height) - 15);
        }
        this.setInterval(addCoords, difficulty);       

        function spawnNewEnemy() {
            function drawLoop(x, y) {
                ctx.fillRect((x - 7), (y - 7), 11, 11);
                ctx.fillStyle = '#1bffc1';
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
                let sin = Math.sin(angle) * perFrameDistance;
                let cos = Math.cos(angle) * perFrameDistance;
                xCoords.splice(i, 1);
                xCoords.splice(i, 0, storedValueX += cos);
                yCoords.splice(i, 1);
                yCoords.splice(i, 0, storedValueY += sin);
            }
        }
        this.setInterval(moveEnemy, 20);

        // Scale difficulty
        function diffFn(){
            if(score === 500) {
                perFrameDistance = .2;
            } else if(score === 1000) {
                perFrameDistance = .3;
            } else if(score === 1500) {
                perFrameDistance = .5;
            } else if(score === 2500) {
                perFrameDistance = .6;
            } else if(score === 3000) {
                perFrameDistance = .7;
            } else if(score >= 4000) {
                perFrameDistance = perFrameDistance += .01;
            }
            
        }

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

        // Turret Muzzle Flash
        function turretBarrelFlash (x1, y1, x2, y2, maxLen) {
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
            ctx.strokeStyle = 'white';
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
            // laserSound.play();
            function fireLoop(){
                ctx.beginPath();
                ctx.moveTo(canvasWidth/2, canvasHeight/2);
                ctx.lineTo(cursorPosX, cursorPosY);
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 1;
                ctx.stroke();
                turretBarrelFlash(canvasWidth/2, canvasHeight/2, cursorPosX, cursorPosY, 30);
                turretBarrel(canvasWidth/2, canvasHeight/2, cursorPosX, cursorPosY, 25);
            }
            function stopLoop(){
                clearInterval(fireInterval);
            }
            const fireInterval = setInterval(fireLoop, 10);
            setTimeout(stopLoop, 50);
            
            // Leaving this here for future reference
            // gameCanvas.addEventListener("mouseup", stopLoop);
            
            // Shoot hit detection
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
                    addScore();
                }
            })
        }

        // Score Tally
        function addScore() {
            score = score += 100;
            scoreBoard.textContent = score;
        }

        // Enemy hits player detection
        function hitDetect() {
            xCoords.forEach((value, index) => {
                let rules = 
                value >= ((canvasWidth/2) - 15) && 
                value <= ((canvasWidth/2) + 15) &&
                yCoords[index] >= ((canvasHeight/2) - 15) &&
                yCoords[index] <= ((canvasHeight/2) + 15)
                ;
                if(rules) {
                    xCoords.forEach((value, index, arr) => {
                        if(value >= ((canvasWidth/2) - 15) && value <= ((canvasWidth/2) + 15) && yCoords[index] >= ((canvasHeight/2) - 15) & yCoords[index] <= ((canvasHeight/2) + 15)) {
                            xCoords[xCoords.indexOf(value)] = 30000;
                        }
                    });
                    yCoords.forEach((value, index, arr) => {
                        if(value >= ((canvasWidth/2) - 15) && value <= ((canvasWidth/2) + 15) && yCoords[index] >= ((canvasHeight/2) - 15) && yCoords[index] <= ((canvasHeight/2) + 15)) {
                            yCoords[yCoords.indexOf(value)] = 30000;
                        }
                    });
                    takeHealth();
                }
            });
        }

        // Remove Health
        function takeHealth() {
            health = health -= 5;
            healthBar.style.width = `${health}%`; 
        }

        // Game loop function
        function gameLoop(){
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            playerTurret.render();
            turretBarrel(canvasWidth/2, canvasHeight/2, cursorPosX, cursorPosY, 25);
            turretTarget(ctx, cursorPosX, cursorPosY);
            spawnNewEnemy();
            diffFn(); 
            hitDetect();
            if(score >= 3000 && health > 0) {
                gameWin();
            } else if(lives > 0 && health <= 1) {
                lives = lives -= 1;
                livesText.textContent = lives;
                health = 100;
                healthBar.style.width = `${health}%`;
            } else if (health <= 1 && lives === 0) {
                gameLose();
            }
        }

        // Game functions
        startButton.addEventListener('click', closeMenu);
        returnMenuWin.addEventListener('click', startScreenWin);
        returnMenuLose.addEventListener('click', startScreenLose);
        resetWin.addEventListener('click', resetGameWin);
        resetLose.addEventListener('click', resetGameLose);
        
        function defaults() {
            xCoords = [];
            yCoords = [];
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            scoreBoard.textContent = '0'
            score = 0;
            health = 100;
            lives = 3;
        }

        function resetGameWin() {
            winMenu.style.display = 'none';
            bottomBar.style.display = 'flex';
            topBar.style.display = 'flex';
            healthText.style.display = 'inline-block';
            defaults();
            gameStartInt = setInterval(gameLoop, 30);
        }
        function resetGameLose() {
            loseMenu.style.display = 'none';
            bottomBar.style.display = 'flex';
            topBar.style.display = 'flex';
            healthText.style.display = 'inline-block';
            defaults();
            gameStartInt = setInterval(gameLoop, 30);
        }
        function startScreenWin() {
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            winMenu.style.display = 'none';
            startMenu.style.display = 'block'
            bottomBar.style.display = 'none';
            topBar.style.display = 'none';
            healthText.style.display = 'none';
            defaults();
        }
        function startScreenLose() {
            ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            loseMenu.style.display = 'none';
            startMenu.style.display = 'block'
            bottomBar.style.display = 'none';
            topBar.style.display = 'none';
            healthText.style.display = 'none';
            defaults();
        }
        function winScreen() {
            winMenu.style.display = 'block';
            bottomBar.style.display = 'none';
            topBar.style.display = 'none';
            healthText.style.display = 'none';
        }
        function loseScreen() {
            loseMenu.style.display = 'block';
            bottomBar.style.display = 'none';
            topBar.style.display = 'none';
            healthText.style.display = 'none';
        }
        function closeMenu() {
            startMenu.style.display = 'none';
            bottomBar.style.display = 'flex';
            topBar.style.display = 'flex';
            healthText.style.display = 'inline-block';
            health = 100;
            score = 0;
            gameStartInt = setInterval(gameLoop, 30);
        }
        
        
        // End States
        function gameWin() {
            winScreen();
            clearInterval(gameStartInt);
        }
        function gameLose() {
            loseScreen();
            clearInterval(gameStartInt);
        }
    }

)