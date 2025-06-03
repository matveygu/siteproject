// Массив символов, которые могут появиться на барабанах
        const items = [
            "7️⃣",
            "7️⃣",
            "7️⃣",
            "7️⃣",
            "7️⃣",
            "7️⃣",
            "7️⃣",
            "7️⃣",
            "7️⃣"
        ];
        // Отображение доступных символов в информационном блоке
        document.querySelector(".info").textContent = items.join(" ");

        // Получаем все элементы "дверей" (барабанов)
        const doors = document.querySelectorAll(".door");
        // Добавляем обработчик события для кнопки "Вращать"
        document.querySelector("#spinner").addEventListener("click", spin);
        // Добавляем обработчик события для кнопки "Обновить"
        document.querySelector("#reseter").addEventListener("click", init);

        // Текущий баланс пользователя
        let deposit = {{ current_user.coins }};
        document.getElementById('deposit').textContent = deposit;

        /**
         * Функция для обработки вращения барабанов.
         * Отправляет запрос на сервер для списания монет и запускает анимацию вращения.
         */
        async function spin() {

            init();

            const bet = parseInt(document.getElementById('bet').value);
            if (isNaN(bet) || bet <= 0 || bet > deposit) {
                alert("Invalid bet!");
                return;
            }

            // Отправляем запрос на сервер для списания монет
            fetch('/spin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `bet=${bet}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }

                deposit = data.coins;
                document.getElementById('deposit').textContent = deposit;

                // Инициализация вращения барабанов
                init(false, 2, 3);
                const promises = Array.from(doors).map((door, index) => {
                    const boxes = door.querySelector(".boxes");
                    const duration = parseInt(boxes.style.transitionDuration);
                    boxes.style.transform = "translateY(0)";
                    return new Promise((resolve) => setTimeout(resolve, duration * 100 * (index + 1)));
                });

                Promise.all(promises).then(() => {
                    // Получаем финальные символы на барабанах
                    const finalSymbols = Array.from(doors).map(door => {
                        const boxes = door.querySelector(".boxes");
                        const finalPosition = parseInt(boxes.style.transform.match(/-(\d+)px/)[1]);
                        const index = (finalPosition / 100) % items.length;
                        return items[Math.floor(index)];
                    });
                    fetch('/spin', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: `bet=${bet}`
                    })

                    // Отправляем результаты на сервер для проверки выигрыша
                    fetch('/check_win', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ symbols: finalSymbols, bet: bet })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.result === 'win') {
                            deposit = data.coins;
                            document.getElementById('deposit').textContent = deposit;
                            alert("You win!");
                        } else {
                            deposit = data.coins;
                            document.getElementById('deposit').textContent = deposit;
                            alert("You lose!");
                        }
                    });
                });
            });
        }

        /**
         * Функция для инициализации или обновления состояния барабанов.
         * @param {boolean} firstInit - Флаг, указывающий, является ли это первой инициализацией.
         * @param {number} groups - Количество групп символов для вращения.
         * @param {number} duration - Длительность анимации вращения.
         */
        function init(firstInit = true, groups = 1, duration = 1) {
            for (const door of doors) {
                if (firstInit) {
                    door.dataset.spinned = "0";
                } else if (door.dataset.spinned === "1") {
                    return;
                }

                const boxes = door.querySelector(".boxes");
                const boxesClone = boxes.cloneNode(false);

                const pool = ["❓"];
                if (!firstInit) {
                    const arr = [];
                    for (let n = 0; n < (groups > 0 ? groups : 1); n++) {
                        arr.push(...items);
                    }
                    pool.push(...shuffle(arr));

                    boxesClone.addEventListener(
                        "transitionstart",
                        function () {
                            door.dataset.spinned = "1";
                            this.querySelectorAll(".box").forEach((box) => {
                                box.style.filter = "blur(1px)";
                            });
                        },
                        { once: true }
                    );

                    boxesClone.addEventListener(
                        "transitionend",
                        function () {
                            this.querySelectorAll(".box").forEach((box, index) => {
                                box.style.filter = "blur(0)";
                                if (index > 0) this.removeChild(box);
                            });
                        },
                        { once: true }
                    );
                }

                for (let i = pool.length - 1; i >= 0; i--) {
                    const box = document.createElement("div");
                    box.classList.add("box");
                    box.style.width = door.clientWidth + "px";
                    box.style.height = door.clientHeight + "px";
                    box.textContent = pool[i];
                    boxesClone.appendChild(box);
                }
                boxesClone.style.transitionDuration = `${duration > 0 ? duration : 1}s`;
                boxesClone.style.transform = `translateY(-${
                    door.clientHeight * (pool.length - 1)
                }px)`;
                door.replaceChild(boxesClone, boxes);
            }
        }

        /**
         * Функция для перемешивания массива.
         * @param {Array} arr - Массив для перемешивания.
         * @returns {Array} Перемешанный массив.
         */
        function shuffle([...arr]) {
            let m = arr.length;
            while (m) {
                const i = Math.floor(Math.random() * m--);
                [arr[m], arr[i]] = [arr[i], arr[m]];
            }
            return arr;
        }

        // Инициализация барабанов при загрузке страницы
        init();