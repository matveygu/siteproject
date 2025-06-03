document.addEventListener('DOMContentLoaded', function() {
    displayRandomSymbols();
});

document.getElementById('spin-button').addEventListener('click', function() {
    spin();
});

function displayRandomSymbols() {
    const reels = document.querySelectorAll('.reel');
    const symbols = ['0_hourglass', '0_telephone', '0_diamond', '0_floppy', '0_seven'];

    reels.forEach(reel => {
        reel.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            const img = document.createElement('img');
            img.src = `/static/images/slots/${randomSymbol}.png`;
            reel.appendChild(img);
        }
    });
}

function spin() {
    let balance = parseInt(document.getElementById('balance').textContent);
    const betAmount = parseInt(document.getElementById('bet-amount').value);

    if (balance < betAmount | 0 >= betAmount) {
        alert(" Не верная ставка!");
        return;
    }

    balance -= betAmount;
    document.getElementById('balance').textContent = balance;

    const reels = document.querySelectorAll('.reel');
    const symbols = ['0_hourglass', '0_telephone', '0_diamond', '0_floppy', '0_seven'];
    const spinDuration = 3000; // Длительность вращения в миллисекундах
    const startTime = Date.now();

    // Создаем длинные случайные последовательности символов для каждого столбца
    const longRandomSequences = Array.from({ length: reels.length }, () => {
        return Array.from({ length: 50 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
    });

    const spinInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;

        if (elapsedTime >= spinDuration) {
            clearInterval(spinInterval);

            // После остановки показываем последние символы из длинной последовательности
            const result = longRandomSequences.map(sequence => {
                return sequence.slice(-3); // Берем последние 3 символа
            });

            displayResult(result);
            calculateWinnings(result, betAmount);
        } else {
            // Показываем вращение с длинной последовательностью
            reels.forEach((reel, index) => {
                reel.innerHTML = '';
                const currentPosition = Math.floor(elapsedTime / 100) % longRandomSequences[index].length;

                for (let i = 0; i < 3; i++) {
                    const symbolIndex = (currentPosition + i) % longRandomSequences[index].length;
                    const img = document.createElement('img');
                    img.src = `/static/images/slots/${longRandomSequences[index][symbolIndex]}.png`;
                    img.classList.add('spin');
                    reel.appendChild(img);
                }
            });
        }
    }, 100);
}

function displayResult(result) {
    const reels = document.querySelectorAll('.reel');
    reels.forEach((reel, i) => {
        reel.innerHTML = '';
        result[i].forEach(symbol => {
            const img = document.createElement('img');
            img.src = `/static/images/slots/${symbol}.png`;
            reel.appendChild(img);
        });
    });
}

function calculateWinnings(result, betAmount) {
    let winnings = 0;

    // Проверяем каждую строку
    for (let row = 0; row < 3; row++) {
        const symbolsInRow = result.map(reel => reel[row]);

        let currentSymbol = null;
        let count = 0;
        let winningIndices = [];

        symbolsInRow.forEach((symbol, index) => {
            if (symbol === currentSymbol) {
                count++;
                winningIndices.push(index);
            } else {
                if (count >= 3) {
                    winningIndices.forEach(col => {
                        const img = document.querySelectorAll('.reel')[col].querySelectorAll('img')[row];
                        img.classList.add('win');
                    });
                    winnings += betAmount * count;
                }
                currentSymbol = symbol;
                count = 1;
                winningIndices = [index];
            }
        });

        // Проверяем последнюю последовательность
        if (count >= 3) {
            winningIndices.forEach(col => {
                const img = document.querySelectorAll('.reel')[col].querySelectorAll('img')[row];
                img.classList.add('win');
            });
            winnings += betAmount * count;
        }
    }

    // Делаем проигрышные символы тусклыми
    document.querySelectorAll('.reel img:not(.win)').forEach(img => {
        img.classList.add('lose');
    });

    document.getElementById('winnings').textContent = winnings;
    let balance = parseInt(document.getElementById('balance').textContent);
    balance += winnings;
    document.getElementById('balance').textContent = balance;

    // Обновление данных пользователя в базе данных
    updateUserBalance(balance);
}

function updateUserBalance(newBalance) {
    // Здесь должна быть логика для обновления баланса пользователя в базе данных
    fetch('/check_win', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ balance: newBalance }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}
