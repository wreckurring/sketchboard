import { useState } from 'react';

// Manages undo/redo history stack
export function useHistory(initialState = []) {
  const [history, setHistory] = useState([initialState]);
  const [step, setStep] = useState(0);

  const setState = (action) => {
    const newState = typeof action === 'function' ? action(history[step]) : action;
    const newHistory = history.slice(0, step + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setStep(newHistory.length - 1);
    return newState;
  };

  const undo = () => {
    if (step > 0) {
      setStep(step - 1);
      return history[step - 1];
    }
    return history[step];
  };

  const redo = () => {
    if (step < history.length - 1) {
      setStep(step + 1);
      return history[step + 1];
    }
    return history[step];
  };

  return {
    state: history[step],
    setState,
    undo,
    redo,
    canUndo: step > 0,
    canRedo: step < history.length - 1,
  };
}
