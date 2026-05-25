'use client';

import { useState, useCallback, useMemo } from 'react';
import BackButton from '@/components/BackButton';

type CalcMode = 'standard' | 'scientific' | 'programmer' | 'date';
type Base = 2 | 8 | 10 | 16;

export default function CalculatorPage() {
  const [mode, setMode] = useState<CalcMode>('standard');

  // Standard / Scientific state
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [isRadian, setIsRadian] = useState(true);

  // Programmer state
  const [progValue, setProgValue] = useState(0);
  const [progBase, setProgBase] = useState<Base>(10);
  const [progDisplay, setProgDisplay] = useState('0');
  const [progOperator, setProgOperator] = useState<string | null>(null);
  const [progPrevValue, setProgPrevValue] = useState<number | null>(null);
  const [progWaiting, setProgWaiting] = useState(false);

  // Date state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ---- Standard / Scientific helpers ----
  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDot = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const backspace = useCallback(() => {
    if (waitingForOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  }, [display, waitingForOperand]);

  const toggleSign = useCallback(() => {
    const val = parseFloat(display);
    setDisplay(String(-val));
  }, [display]);

  const inputPercent = useCallback(() => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  }, [display]);

  const calculate = useCallback((left: number, right: number, op: string): number => {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '×': return left * right;
      case '÷': return right !== 0 ? left / right : NaN;
      default: return right;
    }
  }, []);

  const handleOperator = useCallback((nextOp: string) => {
    const current = parseFloat(display);

    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, current, operator);
      if (isNaN(result) || !isFinite(result)) {
        setDisplay('Error');
        setExpression('');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
        return;
      }
      const resultStr = String(parseFloat(result.toPrecision(12)));
      setDisplay(resultStr);
      setPrevValue(result);
      setExpression(`${resultStr} ${nextOp}`);
    } else {
      setPrevValue(current);
      setExpression(`${display} ${nextOp}`);
    }

    setOperator(nextOp);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, waitingForOperand, calculate]);

  const handleEquals = useCallback(() => {
    if (prevValue === null || operator === null) return;
    const current = parseFloat(display);
    const result = calculate(prevValue, current, operator);

    if (isNaN(result) || !isFinite(result)) {
      setDisplay('Error');
      setExpression('');
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
      return;
    }

    const resultStr = String(parseFloat(result.toPrecision(12)));
    setExpression(`${prevValue} ${operator} ${current} =`);
    setDisplay(resultStr);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, calculate]);

  // Scientific functions
  const toRad = useCallback((v: number) => (isRadian ? v : (v * Math.PI) / 180), [isRadian]);
  const fromRad = useCallback((v: number) => (isRadian ? v : (v * 180) / Math.PI), [isRadian]);

  const applySciFunc = useCallback((func: string) => {
    const val = parseFloat(display);
    let result: number;
    switch (func) {
      case 'sin': result = Math.sin(toRad(val)); break;
      case 'cos': result = Math.cos(toRad(val)); break;
      case 'tan': result = Math.tan(toRad(val)); break;
      case 'log': result = Math.log10(val); break;
      case 'ln': result = Math.log(val); break;
      case 'x²': result = val * val; break;
      case 'x³': result = val * val * val; break;
      case '√': result = Math.sqrt(val); break;
      case '∛': result = Math.cbrt(val); break;
      case 'π': result = Math.PI; break;
      case 'e': result = Math.E; break;
      case '1/x': result = 1 / val; break;
      case 'n!': {
        if (val < 0 || val !== Math.floor(val) || val > 170) { setDisplay('Error'); setWaitingForOperand(true); return; }
        result = 1;
        for (let i = 2; i <= val; i++) result *= i;
        break;
      }
      default: result = val;
    }
    if (isNaN(result) || !isFinite(result)) {
      setDisplay('Error');
    } else {
      setDisplay(String(parseFloat(result.toPrecision(12))));
    }
    setWaitingForOperand(true);
  }, [display, toRad]);

  const handlePowerN = useCallback(() => {
    handleOperator('xⁿ');
  }, [handleOperator]);

  const handleEqualsWithPower = useCallback(() => {
    if (prevValue === null || operator === null) return;
    const current = parseFloat(display);
    let result: number;
    if (operator === 'xⁿ') {
      result = Math.pow(prevValue, current);
    } else {
      result = calculate(prevValue, current, operator);
    }
    if (isNaN(result) || !isFinite(result)) {
      setDisplay('Error');
      setExpression('');
    } else {
      const resultStr = String(parseFloat(result.toPrecision(12)));
      setExpression(`${prevValue} ${operator === 'xⁿ' ? '^' : operator} ${current} =`);
      setDisplay(resultStr);
    }
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, calculate]);

  // ---- Programmer mode ----
  const parseProgInput = useCallback((val: string, base: Base): number => {
    try {
      if (base === 16) return parseInt(val, 16);
      if (base === 8) return parseInt(val, 8);
      if (base === 2) return parseInt(val, 2);
      return parseInt(val, 10);
    } catch {
      return 0;
    }
  }, []);

  const formatProgValue = useCallback((val: number, base: Base): string => {
    if (isNaN(val)) return 'Error';
    const unsigned = val >>> 0;
    switch (base) {
      case 2: return unsigned.toString(2);
      case 8: return unsigned.toString(8);
      case 10: return String(val);
      case 16: return unsigned.toString(16).toUpperCase();
      default: return String(val);
    }
  }, []);

  const progInputDigit = useCallback((digit: string) => {
    if (progWaiting) {
      setProgDisplay(digit);
      setProgWaiting(false);
    } else {
      setProgDisplay(progDisplay === '0' ? digit : progDisplay + digit);
    }
  }, [progDisplay, progWaiting]);

  const progClear = useCallback(() => {
    setProgDisplay('0');
    setProgValue(0);
    setProgPrevValue(null);
    setProgOperator(null);
    setProgWaiting(false);
  }, []);

  const progCalculate = useCallback((left: number, right: number, op: string): number => {
    switch (op) {
      case '+': return (left + right) | 0;
      case '-': return (left - right) | 0;
      case '×': return (left * right) | 0;
      case '÷': return right !== 0 ? (left / right) | 0 : 0;
      case 'AND': return (left & right) | 0;
      case 'OR': return (left | right) | 0;
      case 'XOR': return (left ^ right) | 0;
      case '<<': return (left << (right % 32)) | 0;
      case '>>': return (left >>> (right % 32)) | 0;
      default: return right;
    }
  }, []);

  const handleProgOperator = useCallback((op: string) => {
    const current = parseProgInput(progDisplay, progBase);

    if (progPrevValue !== null && progOperator && !progWaiting) {
      const result = progCalculate(progPrevValue, current, progOperator);
      setProgDisplay(formatProgValue(result, progBase));
      setProgValue(result);
      setProgPrevValue(result);
    } else {
      setProgPrevValue(current);
      setProgValue(current);
    }

    setProgOperator(op);
    setProgWaiting(true);
  }, [progDisplay, progBase, progPrevValue, progOperator, progWaiting, parseProgInput, formatProgValue, progCalculate]);

  const handleProgEquals = useCallback(() => {
    if (progPrevValue === null || progOperator === null) return;
    const current = parseProgInput(progDisplay, progBase);
    const result = progCalculate(progPrevValue, current, progOperator);
    setProgDisplay(formatProgValue(result, progBase));
    setProgValue(result);
    setProgPrevValue(null);
    setProgOperator(null);
    setProgWaiting(true);
  }, [progDisplay, progBase, progPrevValue, progOperator, parseProgInput, formatProgValue, progCalculate]);

  const handleProgNOT = useCallback(() => {
    const current = parseProgInput(progDisplay, progBase);
    const result = ~current;
    setProgDisplay(formatProgValue(result, progBase));
    setProgValue(result);
    setProgWaiting(true);
  }, [progDisplay, progBase, parseProgInput, formatProgValue]);

  const progValueDisplay = useMemo(() => ({
    bin: (progValue >>> 0).toString(2),
    oct: (progValue >>> 0).toString(8),
    dec: String(progValue),
    hex: (progValue >>> 0).toString(16).toUpperCase(),
  }), [progValue]);

  const switchBase = useCallback((newBase: Base) => {
    const current = parseProgInput(progDisplay, progBase);
    setProgBase(newBase);
    setProgDisplay(formatProgValue(current, newBase));
  }, [progDisplay, progBase, parseProgInput, formatProgValue]);

  // ---- Date mode ----
  const dateDiff = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;

    const diffMs = Math.abs(to.getTime() - from.getTime());
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Calculate years, months, days
    let earlier = from < to ? from : to;
    let later = from < to ? to : from;
    let years = later.getFullYear() - earlier.getFullYear();
    let months = later.getMonth() - earlier.getMonth();
    let days = later.getDate() - earlier.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;

    return { totalDays, totalWeeks, totalHours, totalMinutes, years, months, days };
  }, [dateFrom, dateTo]);

  // ---- Button components ----
  const CalcButton = ({ label, onClick, className = '', span = 1 }: {
    label: string;
    onClick: () => void;
    className?: string;
    span?: number;
  }) => (
    <button
      onClick={onClick}
      className={`
        h-12 sm:h-14 rounded-xl text-sm sm:text-base font-medium transition-all active:scale-95
        ${span === 2 ? 'col-span-2' : ''}
        ${className || 'bg-white/5 hover:bg-white/10 text-white'}
      `}
    >
      {label}
    </button>
  );

  const opClass = 'bg-[#fb6400]/20 hover:bg-[#fb6400]/30 text-[#fb6400]';
  const funcClass = 'bg-white/10 hover:bg-white/15 text-white/80';

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="calculator" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">🧮</span>
            </div>
            <h1 className="text-lg font-semibold text-white">专业计算器</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in animate-slide-up">
          {/* Mode tabs */}
          <div className="glass-card p-2 mb-6">
            <div className="grid grid-cols-4 gap-1">
              {(['standard', 'scientific', 'programmer', 'date'] as CalcMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`
                    py-2.5 rounded-xl text-sm font-medium transition-all
                    ${mode === m
                      ? 'bg-[#fb6400] text-white shadow-lg shadow-orange-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'}
                  `}
                >
                  {m === 'standard' ? '标准' : m === 'scientific' ? '科学' : m === 'programmer' ? '程序员' : '日期'}
                </button>
              ))}
            </div>
          </div>

          {/* ========== Standard Mode ========== */}
          {mode === 'standard' && (
            <div className="glass-card p-5 animate-fade-in">
              {/* Display */}
              <div className="mb-4 text-right">
                <div className="text-sm text-white/40 h-6 truncate">{expression}</div>
                <div className="text-4xl font-light text-white truncate">{display}</div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <CalcButton label="C" onClick={clearAll} className={funcClass} />
                <CalcButton label="±" onClick={toggleSign} className={funcClass} />
                <CalcButton label="%" onClick={inputPercent} className={funcClass} />
                <CalcButton label="÷" onClick={() => handleOperator('÷')} className={opClass} />

                <CalcButton label="7" onClick={() => inputDigit('7')} />
                <CalcButton label="8" onClick={() => inputDigit('8')} />
                <CalcButton label="9" onClick={() => inputDigit('9')} />
                <CalcButton label="×" onClick={() => handleOperator('×')} className={opClass} />

                <CalcButton label="4" onClick={() => inputDigit('4')} />
                <CalcButton label="5" onClick={() => inputDigit('5')} />
                <CalcButton label="6" onClick={() => inputDigit('6')} />
                <CalcButton label="-" onClick={() => handleOperator('-')} className={opClass} />

                <CalcButton label="1" onClick={() => inputDigit('1')} />
                <CalcButton label="2" onClick={() => inputDigit('2')} />
                <CalcButton label="3" onClick={() => inputDigit('3')} />
                <CalcButton label="+" onClick={() => handleOperator('+')} className={opClass} />

                <CalcButton label="0" onClick={() => inputDigit('0')} span={2} />
                <CalcButton label="." onClick={inputDot} />
                <CalcButton label="=" onClick={handleEquals} className="bg-[#fb6400] hover:bg-[#fb6400]/80 text-white shadow-lg shadow-orange-500/30" />
              </div>

              <div className="mt-2">
                <CalcButton label="← 退格" onClick={backspace} span={4} className={funcClass + ' w-full col-span-4'} />
              </div>
            </div>
          )}

          {/* ========== Scientific Mode ========== */}
          {mode === 'scientific' && (
            <div className="glass-card p-5 animate-fade-in">
              {/* Angle mode toggle */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setIsRadian(!isRadian)}
                  className="px-3 py-1 rounded-lg text-xs bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {isRadian ? 'RAD' : 'DEG'}
                </button>
                <div className="text-sm text-white/40 truncate ml-4 flex-1 text-right">{expression}</div>
              </div>

              {/* Display */}
              <div className="mb-4 text-right">
                <div className="text-4xl font-light text-white truncate">{display}</div>
              </div>

              {/* Scientific buttons row 1 */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2">
                <CalcButton label="sin" onClick={() => applySciFunc('sin')} className={funcClass} />
                <CalcButton label="cos" onClick={() => applySciFunc('cos')} className={funcClass} />
                <CalcButton label="tan" onClick={() => applySciFunc('tan')} className={funcClass} />
                <CalcButton label="π" onClick={() => applySciFunc('π')} className={funcClass} />
                <CalcButton label="e" onClick={() => applySciFunc('e')} className={funcClass} />
              </div>

              {/* Scientific buttons row 2 */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2">
                <CalcButton label="log" onClick={() => applySciFunc('log')} className={funcClass} />
                <CalcButton label="ln" onClick={() => applySciFunc('ln')} className={funcClass} />
                <CalcButton label="x²" onClick={() => applySciFunc('x²')} className={funcClass} />
                <CalcButton label="x³" onClick={() => applySciFunc('x³')} className={funcClass} />
                <CalcButton label="xⁿ" onClick={handlePowerN} className={funcClass} />
              </div>

              {/* Scientific buttons row 3 */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2">
                <CalcButton label="√" onClick={() => applySciFunc('√')} className={funcClass} />
                <CalcButton label="∛" onClick={() => applySciFunc('∛')} className={funcClass} />
                <CalcButton label="1/x" onClick={() => applySciFunc('1/x')} className={funcClass} />
                <CalcButton label="n!" onClick={() => applySciFunc('n!')} className={funcClass} />
                <CalcButton label="←" onClick={backspace} className={funcClass} />
              </div>

              {/* Standard layout */}
              <div className="grid grid-cols-4 gap-2">
                <CalcButton label="C" onClick={clearAll} className={funcClass} />
                <CalcButton label="±" onClick={toggleSign} className={funcClass} />
                <CalcButton label="%" onClick={inputPercent} className={funcClass} />
                <CalcButton label="÷" onClick={() => handleOperator('÷')} className={opClass} />

                <CalcButton label="7" onClick={() => inputDigit('7')} />
                <CalcButton label="8" onClick={() => inputDigit('8')} />
                <CalcButton label="9" onClick={() => inputDigit('9')} />
                <CalcButton label="×" onClick={() => handleOperator('×')} className={opClass} />

                <CalcButton label="4" onClick={() => inputDigit('4')} />
                <CalcButton label="5" onClick={() => inputDigit('5')} />
                <CalcButton label="6" onClick={() => inputDigit('6')} />
                <CalcButton label="-" onClick={() => handleOperator('-')} className={opClass} />

                <CalcButton label="1" onClick={() => inputDigit('1')} />
                <CalcButton label="2" onClick={() => inputDigit('2')} />
                <CalcButton label="3" onClick={() => inputDigit('3')} />
                <CalcButton label="+" onClick={() => handleOperator('+')} className={opClass} />

                <CalcButton label="0" onClick={() => inputDigit('0')} span={2} />
                <CalcButton label="." onClick={inputDot} />
                <CalcButton label="=" onClick={operator === 'xⁿ' ? handleEqualsWithPower : handleEquals} className="bg-[#fb6400] hover:bg-[#fb6400]/80 text-white shadow-lg shadow-orange-500/30" />
              </div>
            </div>
          )}

          {/* ========== Programmer Mode ========== */}
          {mode === 'programmer' && (
            <div className="glass-card p-5 animate-fade-in">
              {/* Base selector */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {([2, 8, 10, 16] as Base[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => switchBase(b)}
                    className={`
                      py-2 rounded-lg text-xs font-medium transition-all
                      ${progBase === b
                        ? 'bg-[#fb6400] text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'}
                    `}
                  >
                    {b === 2 ? '二进制' : b === 8 ? '八进制' : b === 10 ? '十进制' : '十六进制'}
                  </button>
                ))}
              </div>

              {/* Display */}
              <div className="mb-4 text-right">
                <div className="text-sm text-white/40 h-5 truncate">
                  {progOperator && progPrevValue !== null ? `${formatProgValue(progPrevValue, progBase)} ${progOperator}` : ''}
                </div>
                <div className="text-3xl font-light text-white truncate font-mono">{progDisplay}</div>
              </div>

              {/* Base representations */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/40">二进制 </span>
                  <span className="text-white/80 font-mono truncate block">{progValueDisplay.bin}</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/40">八进制 </span>
                  <span className="text-white/80 font-mono truncate block">{progValueDisplay.oct}</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/40">十进制 </span>
                  <span className="text-white/80 font-mono truncate block">{progValueDisplay.dec}</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/40">十六进制 </span>
                  <span className="text-white/80 font-mono truncate block">{progValueDisplay.hex}</span>
                </div>
              </div>

              {/* Bitwise operations */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                <CalcButton label="AND" onClick={() => handleProgOperator('AND')} className={funcClass} />
                <CalcButton label="OR" onClick={() => handleProgOperator('OR')} className={funcClass} />
                <CalcButton label="XOR" onClick={() => handleProgOperator('XOR')} className={funcClass} />
                <CalcButton label="NOT" onClick={handleProgNOT} className={funcClass} />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                <CalcButton label="<<" onClick={() => handleProgOperator('<<')} className={funcClass} />
                <CalcButton label=">>" onClick={() => handleProgOperator('>>')} className={funcClass} />
                <CalcButton label="C" onClick={progClear} className={funcClass} />
                <CalcButton label="←" onClick={() => setProgDisplay(progDisplay.length > 1 ? progDisplay.slice(0, -1) : '0')} className={funcClass} />
              </div>

              {/* Number pad - conditional based on base */}
              <div className="grid grid-cols-4 gap-2">
                {progBase >= 10 && <CalcButton label="A" onClick={() => progInputDigit('A')} className={funcClass} />}
                {progBase >= 10 && <CalcButton label="B" onClick={() => progInputDigit('B')} className={funcClass} />}
                {progBase >= 10 && <CalcButton label="C" onClick={() => progInputDigit('C')} className={funcClass} />}
                {progBase >= 10 && <CalcButton label="D" onClick={() => progInputDigit('D')} className={funcClass} />}
                {progBase >= 10 && <CalcButton label="E" onClick={() => progInputDigit('E')} className={funcClass} />}
                {progBase >= 10 && <CalcButton label="F" onClick={() => progInputDigit('F')} className={funcClass} />}
                {progBase < 10 && <CalcButton label="÷" onClick={() => handleProgOperator('÷')} className={opClass} />}
                {progBase < 10 && <CalcButton label="×" onClick={() => handleProgOperator('×')} className={opClass} />}
                {progBase < 10 && <CalcButton label="-" onClick={() => handleProgOperator('-')} className={opClass} />}
                {progBase < 10 && <CalcButton label="+" onClick={() => handleProgOperator('+')} className={opClass} />}
                {progBase < 10 && <CalcButton label="=" onClick={handleProgEquals} className="bg-[#fb6400] hover:bg-[#fb6400]/80 text-white shadow-lg shadow-orange-500/30" />}
                {progBase < 10 && <CalcButton label="0" onClick={() => progInputDigit('0')} />}

                {/* Digits available based on base */}
                {(progBase >= 8 ? [7, 6, 5, 4] : progBase >= 2 ? [1] : []).map((d) => (
                  <CalcButton key={d} label={String(d)} onClick={() => progInputDigit(String(d))} />
                ))}
                {(progBase >= 8 ? [] : progBase >= 2 ? [0] : []).map((d) => (
                  <CalcButton key={d} label={String(d)} onClick={() => progInputDigit(String(d))} span={2} />
                ))}

                {progBase >= 10 && (
                  <>
                    <CalcButton label="7" onClick={() => progInputDigit('7')} />
                    <CalcButton label="8" onClick={() => progInputDigit('8')} />
                    <CalcButton label="9" onClick={() => progInputDigit('9')} />
                    <CalcButton label="÷" onClick={() => handleProgOperator('÷')} className={opClass} />
                    <CalcButton label="4" onClick={() => progInputDigit('4')} />
                    <CalcButton label="5" onClick={() => progInputDigit('5')} />
                    <CalcButton label="6" onClick={() => progInputDigit('6')} />
                    <CalcButton label="×" onClick={() => handleProgOperator('×')} className={opClass} />
                    <CalcButton label="1" onClick={() => progInputDigit('1')} />
                    <CalcButton label="2" onClick={() => progInputDigit('2')} />
                    <CalcButton label="3" onClick={() => progInputDigit('3')} />
                    <CalcButton label="-" onClick={() => handleProgOperator('-')} className={opClass} />
                    <CalcButton label="0" onClick={() => progInputDigit('0')} span={2} />
                    <CalcButton label="+" onClick={() => handleProgOperator('+')} className={opClass} />
                    <CalcButton label="=" onClick={handleProgEquals} className="bg-[#fb6400] hover:bg-[#fb6400]/80 text-white shadow-lg shadow-orange-500/30" />
                  </>
                )}

                {progBase === 2 && (
                  <>
                    <CalcButton label="0" onClick={() => progInputDigit('0')} />
                    <CalcButton label="=" onClick={handleProgEquals} className="bg-[#fb6400] hover:bg-[#fb6400]/80 text-white shadow-lg shadow-orange-500/30" span={2} />
                  </>
                )}

                {progBase === 8 && (
                  <>
                    <CalcButton label="3" onClick={() => progInputDigit('3')} />
                    <CalcButton label="÷" onClick={() => handleProgOperator('÷')} className={opClass} />
                    <CalcButton label="0" onClick={() => progInputDigit('0')} />
                    <CalcButton label="1" onClick={() => progInputDigit('1')} />
                    <CalcButton label="2" onClick={() => progInputDigit('2')} />
                    <CalcButton label="×" onClick={() => handleProgOperator('×')} className={opClass} />
                    <CalcButton label="=" onClick={handleProgEquals} className="bg-[#fb6400] hover:bg-[#fb6400]/80 text-white shadow-lg shadow-orange-500/30" span={2} />
                    <CalcButton label="-" onClick={() => handleProgOperator('-')} className={opClass} />
                    <CalcButton label="+" onClick={() => handleProgOperator('+')} className={opClass} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========== Date Mode ========== */}
          {mode === 'date' && (
            <div className="glass-card p-6 animate-fade-in">
              <h2 className="text-base font-semibold text-white mb-5">日期计算</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-white/60 mb-2">起始日期</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#fb6400] transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">结束日期</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#fb6400] transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {dateDiff ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center py-4 bg-white/5 rounded-xl">
                    <div className="text-4xl font-bold text-[#fb6400] mb-1">{dateDiff.totalDays}</div>
                    <div className="text-sm text-white/60">天</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center bg-white/5 rounded-xl py-3">
                      <div className="text-xl font-semibold text-white">{dateDiff.years}</div>
                      <div className="text-xs text-white/40">年</div>
                    </div>
                    <div className="text-center bg-white/5 rounded-xl py-3">
                      <div className="text-xl font-semibold text-white">{dateDiff.months}</div>
                      <div className="text-xs text-white/40">月</div>
                    </div>
                    <div className="text-center bg-white/5 rounded-xl py-3">
                      <div className="text-xl font-semibold text-white">{dateDiff.days}</div>
                      <div className="text-xs text-white/40">日</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between bg-white/5 rounded-lg px-4 py-2.5">
                      <span className="text-white/40">总周数</span>
                      <span className="text-white">{dateDiff.totalWeeks} 周</span>
                    </div>
                    <div className="flex justify-between bg-white/5 rounded-lg px-4 py-2.5">
                      <span className="text-white/40">总小时</span>
                      <span className="text-white">{dateDiff.totalHours.toLocaleString()} h</span>
                    </div>
                    <div className="flex justify-between bg-white/5 rounded-lg px-4 py-2.5 col-span-2">
                      <span className="text-white/40">总分钟</span>
                      <span className="text-white">{dateDiff.totalMinutes.toLocaleString()} min</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-sm text-white/40">选择两个日期查看差值</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
