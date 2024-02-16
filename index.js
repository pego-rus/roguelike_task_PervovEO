//Код в стиле ES5, также есть вариация, написанная в стиле ES6. Для тестирования версии ES6 подключить в html 'indexES6.js'.

//Честно украденный отсюда (https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/find)...
//...полифил для метода Array.find(), который не был реализован в ES5
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function(predicate) {
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var thisArg = arguments[1];
        var k = 0;
        while (k < len) {
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          k++;
        }
        return undefined;
      },
      configurable: true,
      writable: true
    });
}

//id всех возможных элементов карты, используемые в основном массиве с позицией элементов игры на карте (globalPositionState)
var tileW = 0;
var tile = 1;
var tileE = 2;
var tileP = 3;
var tileHP = 4;
var tileSW = 5;

//хранение состояния игрового персонажа
var personState = {
    currPos: [null, null],
    nextPos: [null, null],
    hp: 100,
    power: 25,
};

//хранение инвентаря
var inventoryState = [];

//хранение состояния противников
var enemiesState = [];

//проигрывание музыки в ходе игры
function playSound(sound) {
    var audio = new Audio();
    audio.src = './sounds/' + sound + '.mp3';
    audio.volume = 0.5;
    audio.autoplay = true;
}

//функция getRandomNumber выводит целое псевдорандомное число от start до end включтельно
function getRandomNumber(start, end) {
    return Math.floor(Math.random() * (end - start + 1) + start)
}

//генерирование комнат
function generateRoom(currY, currX, mapState) {
    var roomWidth = getRandomNumber(3, 8);
    var roomHeigth = getRandomNumber(3, 8);
    for (var h = 0; roomHeigth > h; h++) {
        for (var w = 0; roomWidth > w; w++) {
            if (currY + h < 24 && currX + w < 40) {
                mapState[currY + h][currX + w] = tile
            }
        }
    }
}

//генерирование горизональных проходов
function generateHorizontalPassage(currX, mapState) {
    for (var y = 0; y < 24; y++) {
        mapState[y][currX] = tile;
    }
}

//генерирование вертикальных проходов
function generateVerticalPassage(currY, mapState) {
    for (var x = 0; x < 40; x++) {
        mapState[currY][x] = tile;
    }
}

//функция запуска нового уровня
function startNewLevel(){
    window.location.reload()
}

//функция generateStartMap создает начальное поле для игры и размещает в нем комнаты, а также вертикальные и горизонтальные проходы
function generateStartMap () {
    var mapState = []
    var roomQuantity = getRandomNumber(5, 10); //количество комнат
    var horizontalPassageQuantity = getRandomNumber(3, 5); //количество горизонтальных корридоров
    var verticalPassageQuantity = getRandomNumber(3, 5); //количество вертикальных корридоров
    var person = 1;
    var enemies = 10; //количество врагов на старте
    var bottles = 10; //количество зелий на старте
    var swords = 2; //количество мечей на старте
    //заполнение игрового поля стенными блоками
    for (var i = 0; i<24; i++) {
        mapState.push([])
        for (var j = 0; j<40; j++) {
            mapState[i][j] = tileW
        }
    };
    //заполнение игрового поля комнатами
    while (roomQuantity > 0) {
        for (i = 0; i<23; i++) {
            for (j = 0; j<39; j++) {
                //псевдорандомное значение 0,99 для условия if подобрано экспериментальным путем для более равномерного распределения комнат по игровому полю
                if ((Math.random() > 0.99) && (roomQuantity > 0) && (mapState[i][j] !== tile)) {
                    generateRoom(i, j, mapState);
                    roomQuantity -= 1;
                }
            }
        }
    };
    //заполнение игрового поля корридорами
    while (horizontalPassageQuantity > 0) {
        for (j = 0; j < 40; j++) {
            if ((Math.random() > 0.99) && (horizontalPassageQuantity > 0)) {
                generateHorizontalPassage(j, mapState);
                horizontalPassageQuantity -= 1;
            }
        }
    };
    while (verticalPassageQuantity > 0) {
        for (i = 0; i < 24; i++) {
            if ((Math.random() > 0.99) && (verticalPassageQuantity > 0)) {
                generateVerticalPassage(i, mapState);
                verticalPassageQuantity -= 1;
            }
        }
    };
    //проверка на наличие закрытых комнат (поиск комнаты, проверка верхней и левой грани комнаты на наличие пересечений с корридорами, а также граничных условий)
    //вспомогательная функция для проверки наличия предполагаемого корридора
    function checkLine(type, cordY, cordX) {
        switch (type) {
            case 'vertical': {
                for (var i = cordY; i >= 0; i--) {
                    if (mapState[i][cordX] === tileW) {
                        return true
                    }
                };
                return false;
            }
            case 'horizontal': {
                for (var j = cordX; j >= 0; j--) {
                    if (mapState[cordY][j] === tileW) {
                        return true
                    }
                };
                return false;
            }
        }
    };
    //функция для проверки комнаты на замкнутость с использованием вспомогательной функции
    function checkRoom(y, x) {
        var counter = 0;
        //проверка на то, что мы находимся в левом верхнем углу комнаты
        if ((y - 1 > 0 && mapState[y - 1][x] !== tileW) || (x - 1 > 0 && mapState[y][x - 1] !== tileW)) {
            return false
        };
        //проверка верхней грани комнаты
        while (mapState[y - 1][x + counter] === tileW)  {
            if (mapState[y][x + counter] === tileW) {
                break
            }
            counter += 1;
        };
        //выходим, если на верхней грани комнаты обнаружено пересечение с корридором
        if (x + counter < mapState[y - 1].length && mapState[y - 1][x + counter] !== tileW && (!checkLine('vertical', y, x + counter))) {
            return false
        };
        //проверяем левую грань комнаты, в т.ч. на соприкосновение с краем карты (исключаем такие случаи для упрощения проверки на замкнутость комнат)
        counter = 0;
        if (x - 1 === 0) {
            return true
        };
        while (y + counter < mapState.length && mapState[y + counter][x - 1] === tileW)  {
            if (mapState[y + counter][x] === tileW) {
                return true
            }
            if (mapState[y + counter][x - 1] !== tileW) {
                return false
            }
            counter += 1;
        };
        //проверяем левую грань комнаты, если дошли до границы карты, также проверяем на отсутcтвие пересечения с корридором
        if (x - 1 > 0 && y + counter === mapState.length && mapState[y + counter - 1][x-1] === tileW && (checkLine('horizontal', y + counter - 1, x))) {
            return true
        } else return false
    }
    //поиск комнат или соседствующих корридоров
    for (i = 1; i<23; i++) {
        for (j = 1; j<39; j++) {
            if (mapState[i][j] === tile 
                && mapState[i][j+1] === tile
                && mapState[i+1][j] === tile
                && mapState[i+1][j+1] === tile) {
                var containingClosedRooms = false;
                containingClosedRooms = checkRoom(i, j);
                //перезапуск генерации при нахождении закрытой комнаты
                if (containingClosedRooms) {
                    console.log('found', i, j)
                    return generateStartMap()
                };
            }
        }
    };
    // генерация массива для хранения состояния врагов
    for (i = 0; i < 10; i++) {
        enemiesState.push({
            currPos: [null, null],
            nextPos: [null, null],
            hp: 100
        })
    };
    // заполнение игрового поля врагами, зельями и мечами
    while (enemies > 0 || bottles > 0 || swords > 0) {
        for (i = 0; i < 24; i++) {
            for (j = 0; j < 40; j++) {
                if (mapState[i][j] === tile) {
                    if (Math.random() > 0.99 && bottles > 0) {
                        mapState[i][j] = tileHP;
                        bottles -= 1;
                    } else if ( Math.random() > 0.99 && swords > 0) {
                        mapState[i][j] = tileSW;
                        swords -= 1;
                    } else if (Math.random() > 0.99 && enemies > 0) {
                        mapState[i][j] = tileE;
                        enemiesState[10 - enemies].currPos = [i, j];
                        enemies -= 1;
                    }
                }
            }
        }
    };
    //установка начального положения игрока на поле
    while (person === 1) {
        for (i = 0; i < 24; i++) {
            for (j = 0; j < 40; j++) {
                if ((Math.random() > 0.99) && (mapState[i][j] === tile)) {
                    mapState[i][j] = tileP;
                    personState.currPos = [i, j]
                    return mapState
                }
            }
        }
    };
}

//рендер карты по массиву globalPositionState
function renderMap (renderedMap) {
    var fieldDiv = (document.querySelector('.field'));
    fieldDiv.innerHTML = '';
    //вынесенный рендер каждого отдельного элемента
    function renderItem (name) {
        var item = document.createElement('div');
        item.classList.add('tile', name);
        item.style.cssText += 'top: ' + i*25.6 + 'px; left: ' + j*25.6 + 'px';
        return item
    };
    //применение вынесенного рендера
    for (var i = 0; i < 24; i++) {
        for (var j = 0; j < 40; j++) {
            switch (renderedMap[i][j]) {
                case tileW: {
                    fieldDiv.appendChild(renderItem('tileW'))
                    break
                }
                case tile: {
                    fieldDiv.appendChild(renderItem('tile'))
                    break
                }
                case tileE: {
                    var tileEElement = renderItem('tileE')
                    var enemyHP = document.createElement('div');
                    enemyHP.classList.add('health');
                    var enemy = enemiesState.find(function (el) {return el.currPos[0] == i && el.currPos[1] == j});
                    enemyHP.style.cssText = 'width:' + enemy.hp + '%';
                    tileEElement.appendChild(enemyHP);
                    fieldDiv.appendChild(tileEElement);
                    break
                }
                case tileP: {
                    var tilePElement = document.createElement('div');
                    tilePElement.classList.add('tile', 'tileP');
                    tilePElement.style.cssText += 'top: ' + i*25.6 + 'px; left: ' + j*25.6 + 'px';
                    var personHP = document.createElement('div');
                    personHP.classList.add('health');
                    personHP.style.cssText += 'width:' + personState.hp + '%';
                    tilePElement.appendChild(personHP);
                    fieldDiv.appendChild(tilePElement)
                    break
                }
                case tileHP: {
                    fieldDiv.appendChild(renderItem('tileHP'))
                    break
                }
                case tileSW: {
                    fieldDiv.appendChild(renderItem('tileSW'))
                    break
                }
            }
        }
    }
}

//реализация добавления собранных предметов в инвентарь
function addToInventory(item) {
    playSound('pickSound');
    var inventory = document.querySelector('.inventory');
    inventory.innerHTML = '';
    inventoryState.push(item);
    inventoryState.forEach(function (element) {
        document.createElement('div')
        var itemDiv = document.createElement('div');
        if (element === 5) {
            itemDiv.classList.add('tileSW')
        } else {
            itemDiv.classList.add('tileHP')
        };
        inventory.appendChild(itemDiv)
    });
}

//реализация передвижения противников по карте на каждый ход
function moveEnemies() {
    //проверка наличия рядом персонажа и атака персонажа противниками
    function attackPerson (enemy) {
        if ((personState.currPos[0] == enemy.currPos[0] - 1 && personState.currPos[1] == enemy.currPos[1]) 
                        || (personState.currPos[0] == enemy.currPos[0] + 1 && personState.currPos[1] == enemy.currPos[1]) 
                        || (personState.currPos[1] == enemy.currPos[1] - 1 && personState.currPos[0] == enemy.currPos[0]) 
                        || (personState.currPos[1] == enemy.currPos[1] + 1 && personState.currPos[0] == enemy.currPos[0])) {
                            personState.hp -= 10;
                            playSound('damageSound');
                        };
    }
    //передвижение противника
    function moveRandomizedDirection (currEnemy) {
        if (currEnemy.nextPos[0] >= 0 
            && currEnemy.nextPos[1] >= 0 
            && currEnemy.nextPos[0] < globalPositionState.length 
            && currEnemy.nextPos[1] < globalPositionState[0].length) {
                if (globalPositionState[currEnemy.nextPos[0]][currEnemy.nextPos[1]] === tile) {
                    globalPositionState[currEnemy.nextPos[0]][currEnemy.nextPos[1]] = globalPositionState[currEnemy.currPos[0]][currEnemy.currPos[1]];
                    globalPositionState[currEnemy.currPos[0]][currEnemy.currPos[1]] = tile;
                    currEnemy.currPos = [currEnemy.nextPos[0], currEnemy.nextPos[1]];                    
                };
        };
        //Возродиться, если у героя кончилось здоровье?
        if (personState.hp < 0) {
            playSound('endGameSound');
            if (confirm('Level Failed! Respawn?')) {
                personState.hp = 100;
            } else startNewLevel();

        }
    }
    //логика рандомного передвижения противника
    enemiesState.forEach(function (currEnemy) {
        if (currEnemy.currPos[0] === null) return;
        attackPerson(currEnemy);
        var randomizedDirection = getRandomNumber(1, 4);
        switch (randomizedDirection) {
            case 1:
                currEnemy.nextPos = [currEnemy.currPos[0] + 1, currEnemy.currPos[1]];
                moveRandomizedDirection(currEnemy);              
                break
            case 2:
                currEnemy.nextPos = [currEnemy.currPos[0] - 1, currEnemy.currPos[1]];
                moveRandomizedDirection(currEnemy);
                break
            case 3:
                currEnemy.nextPos = [currEnemy.currPos[0], currEnemy.currPos[1] + 1];
                moveRandomizedDirection(currEnemy);
                break
            case 4:
                currEnemy.nextPos = [currEnemy.currPos[0], currEnemy.currPos[1] - 1];
                moveRandomizedDirection(currEnemy);
                break
        };
    })
}

//при нажатии на WASD реализуется логика перемещения героя на следующий шаг:
function moveToNextPos(i, j) {
    //описание логики перемещения героя вне зависимости от соседнего блока
    function moveByEachAction() {
        globalPositionState[i][j] = tileP;
        globalPositionState[personState.currPos[0]][personState.currPos[1]] = tile;
        personState.currPos[0] = personState.nextPos[0];
        personState.currPos[1] = personState.nextPos[1];
    }
    //определение соседних блоков и изменение состояния героя в зависимости от этого
    try {
        if (j == globalPositionState[0].length || j < 0 
            || i == globalPositionState.length || i < 0) {
            throw new Error('This is the end of map!')
        };
        playSound('moveSound');   
        switch (globalPositionState[i][j]) {
            case tile:
                moveByEachAction()
                break
            case tileSW:
                personState.power += 25;
                moveByEachAction();
                addToInventory(tileSW);
                break
            case tileHP:
                if (personState.hp > 75) {
                    personState.hp = 100;
                } else {personState.hp += 25};
                moveByEachAction();
                addToInventory(tileHP);
                break
            case tileW:
                playSound('bumpSound');
                break
        }
    } catch (error) {
        console.log(error.message);
        playSound('bumpSound');
    } 
}

//обработка игровых действий
function initializeGameAction (event) {
    //изменение позиции героя в его собственном состоянии...
    function changePersonPosition(y, x) {
        personState.nextPos[0] = y;
        personState.nextPos[1] = x;
    }
    //...в зависимости от нажатой клавиши 
    switch (event.code) {
        case 'KeyW':
            changePersonPosition(personState.currPos[0] - 1, personState.currPos[1])
            moveToNextPos(personState.nextPos[0], personState.nextPos[1]);
            break
        case 'KeyA':
            changePersonPosition(personState.currPos[0], personState.currPos[1] - 1)
            moveToNextPos(personState.nextPos[0], personState.nextPos[1]);
            break
        case 'KeyS':
            changePersonPosition(personState.currPos[0] + 1, personState.currPos[1])
            moveToNextPos(personState.nextPos[0], personState.nextPos[1]);
            break
        case 'KeyD':
            changePersonPosition(personState.currPos[0], personState.currPos[1] + 1)
            moveToNextPos(personState.nextPos[0], personState.nextPos[1]);
            break
        case 'Space':
            playSound('fightSound');
            //При нажатии Space проверка нахождения врагов на соседних клетках (слева, справа, сверху, снизу)
            enemiesState = enemiesState.map(function (currEnemy) {
                if ((currEnemy.currPos[0] == personState.currPos[0] - 1 && currEnemy.currPos[1] == personState.currPos[1]) 
                    || (currEnemy.currPos[0] == personState.currPos[0] + 1 && currEnemy.currPos[1] == personState.currPos[1]) 
                    || (currEnemy.currPos[1] == personState.currPos[1] - 1 && currEnemy.currPos[0] == personState.currPos[0]) 
                    || (currEnemy.currPos[1] == personState.currPos[1] + 1 && currEnemy.currPos[0] == personState.currPos[0]))
                        { currEnemy.hp -= personState.power };
                //При снижении hp врага ниже 0, враг пропадает с карты       
                if (currEnemy.hp <= 0 && currEnemy.currPos[0] != null) {
                    globalPositionState[currEnemy.currPos[0]][currEnemy.currPos[1]] = tile;
                    currEnemy.currPos = [null, null];
                }
                return currEnemy
                });                
            break
    };
    //Активация передвижения врагов
    if (event.code == 'KeyW' || event.code == 'KeyA' || event.code == 'KeyS' || event.code == 'KeyD' || event.code == 'Space') {moveEnemies()};
    renderMap(globalPositionState);
    //Проверка на наличие врагов на карте (Победа?)
    if (enemiesState.filter(function (el) {return el.currPos[0] != null}).length == 0) {
        setTimeout(function () {
            playSound('endGameSound');
            if (confirm('Level Passed! Continue?')) {
                startNewLevel();
            }
        }), 200;
    };
}

//в начале игры генерируется карта
var globalPositionState = generateStartMap();

//рендер карты происходит в начале игры и далее при каждом шаге (events)
renderMap(globalPositionState);

//сообщение о начале игры на событии onload
window.addEventListener('load', function () {alert('Game starts!')});

//обработчик нажатия клавиш при игре
window.addEventListener('keydown', initializeGameAction);
