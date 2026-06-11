const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const memoryIndicatorEl = document.getElementById('memory-indicator');

let currentValue = '0';
let previousValue = '';
let operator = null;
let shouldResetDisplay = false;
let memory = 0;

function roundResult(value) {
  return Math.round(value * 1e10) / 1e10;
}

function getDisplayNumber() {
  if (currentValue === 'Erro') return null;
  const value = parseFloat(currentValue);
  return Number.isNaN(value) ? null : value;
}

function updateDisplay() {
  resultEl.textContent = currentValue;
  expressionEl.textContent = previousValue && operator
    ? `${previousValue} ${getOperatorSymbol(operator)}`
    : '';
  memoryIndicatorEl.textContent = memory !== 0 ? 'M' : '';
}

function memoryClear() {
  memory = 0;
  updateDisplay();
}

function memoryRecall() {
  currentValue = String(roundResult(memory));
  shouldResetDisplay = true;
  updateDisplay();
}

function memoryAdd() {
  const value = getDisplayNumber();
  if (value === null) return;
  memory = roundResult(memory + value);
  updateDisplay();
}

function memorySubtract() {
  const value = getDisplayNumber();
  if (value === null) return;
  memory = roundResult(memory - value);
  updateDisplay();
}

function getOperatorSymbol(op) {
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return symbols[op] || op;
}

function getOperatorAscii(op) {
  const symbols = { '+': '+', '-': '-', '*': '*', '/': '/' };
  return symbols[op] || op;
}

async function saveLog(entry) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
    });
  } catch {
    console.warn('Não foi possível salvar o log. Execute o servidor (server.ps1 ou server.js).');
  }
}

function inputNumber(value) {
  if (shouldResetDisplay) {
    currentValue = value === '.' ? '0.' : value;
    shouldResetDisplay = false;
  } else if (value === '.') {
    if (!currentValue.includes('.')) {
      currentValue += '.';
    }
  } else if (currentValue === '0') {
    currentValue = value;
  } else {
    currentValue += value;
  }
  updateDisplay();
}

function inputOperator(op) {
  if (operator && !shouldResetDisplay) {
    calculate();
  }
  previousValue = currentValue;
  operator = op;
  shouldResetDisplay = true;
  updateDisplay();
}

function calculate(shouldLog = false) {
  if (!operator || !previousValue) return;

  const prev = parseFloat(previousValue);
  const current = parseFloat(currentValue);
  const opSymbol = getOperatorAscii(operator);
  const logExpression = `${previousValue} ${opSymbol} ${currentValue}`;
  let result;

  switch (operator) {
    case '+': result = prev + current; break;
    case '-': result = prev - current; break;
    case '*': result = prev * current; break;
    case '/':
      if (current === 0) {
        if (shouldLog) saveLog(`${logExpression} = Erro`);
        currentValue = 'Erro';
        previousValue = '';
        operator = null;
        shouldResetDisplay = true;
        updateDisplay();
        return;
      }
      result = prev / current;
      break;
    default: return;
  }

  result = roundResult(result);
  if (shouldLog) saveLog(`${logExpression} = ${result}`);
  currentValue = String(result);
  previousValue = '';
  operator = null;
  shouldResetDisplay = true;
  updateDisplay();
}

function clear() {
  currentValue = '0';
  previousValue = '';
  operator = null;
  shouldResetDisplay = false;
  updateDisplay();
}

function backspace() {
  if (currentValue.length <= 1 || currentValue === 'Erro') {
    currentValue = '0';
  } else {
    currentValue = currentValue.slice(0, -1);
  }
  updateDisplay();
}

function percent() {
  const value = parseFloat(currentValue) / 100;
  currentValue = String(value);
  updateDisplay();
}

document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action === 'clear') clear();
    else if (action === 'backspace') backspace();
    else if (action === 'percent') percent();
    else if (action === 'memory-clear') memoryClear();
    else if (action === 'memory-recall') memoryRecall();
    else if (action === 'memory-add') memoryAdd();
    else if (action === 'memory-subtract') memorySubtract();
    else if (action === 'operator') inputOperator(value);
    else if (action === 'equals') calculate(true);
    else if (value) inputNumber(value);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') inputNumber(e.key);
  else if (e.key === '.') inputNumber('.');
  else if (e.key === '+') inputOperator('+');
  else if (e.key === '-') inputOperator('-');
  else if (e.key === '*') inputOperator('*');
  else if (e.key === '/') { e.preventDefault(); inputOperator('/'); }
  else if (e.key === 'Enter' || e.key === '=') calculate(true);
  else if (e.key === 'Escape') clear();
  else if (e.key === 'Backspace') backspace();
});

updateDisplay();
