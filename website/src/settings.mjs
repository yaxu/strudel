import { atom } from 'nanostores';
import { persistentMap, persistentAtom } from '@nanostores/persistent';
import { useStore } from '@nanostores/react';
import { register } from '@strudel.cycles/core';
import * as tunes from './repl/tunes.mjs';
import { logger } from '@strudel.cycles/core';
import { nanoid } from 'nanoid';
export let $publicPatterns = atom([]);
export let $featuredPatterns = atom([]);

export const defaultAudioDeviceName = 'System Standard';

export const defaultSettings = {
  activeFooter: 'intro',
  keybindings: 'codemirror',
  isLineNumbersDisplayed: true,
  isActiveLineHighlighted: true,
  isAutoCompletionEnabled: false,
  isTooltipEnabled: false,
  isFlashEnabled: true,
  isLineWrappingEnabled: false,
  isPatternHighlightingEnabled: true,
  theme: 'strudelTheme',
  fontFamily: 'monospace',
  fontSize: 18,
  latestCode: '',
  isZen: false,
  soundsFilter: 'all',
  panelPosition: 'right',
  userPatterns: '{}',
  audioDeviceName: defaultAudioDeviceName,
};

export const settingsMap = persistentMap('strudel-settings', defaultSettings);

const defaultCode = '';
//pattern that the use is currently viewing in the window
const $viewingPattern = persistentAtom('viewingPattern', '', { listen: false });
export function setViewingPattern(key) {
  $viewingPattern.set(key);
}
export function getViewingPattern() {
  return $viewingPattern.get();
}

export function useViewingPattern() {
  return useStore($viewingPattern);
}

// const $viewingCollection = persistentAtom('viewingCollection', '', { listen: false });
// export function setViewingCollection(key) {
//   $viewingCollection.set(key);
// }
// export function getViewingCollection() {
//   return $viewingCollection.get();
// }

// export function useViewingCollection() {
//   return useStore($viewingCollection);
// }
// active pattern is separate, because it shouldn't sync state across tabs
// reason: https://github.com/tidalcycles/strudel/issues/857
const $activePattern = persistentAtom('activePattern', '', { listen: false });

export function setActivePattern(key) {
  $activePattern.set(key);
}
export function getActivePattern() {
  return $activePattern.get();
}
export function useActivePattern() {
  return useStore($activePattern);
}
export function initUserCode(code) {
  const patterns = { ...userPattern.getAll(), ...examplePattern.getAll() };
  const match = Object.entries(patterns).find(([_, pat]) => pat.code === code);
  const id = match?.[0];
  if (id != null) {
    setActivePattern(id);
    setViewingPattern(id);
  }
}

export function useSettings() {
  const state = useStore(settingsMap);

  const userPatterns = JSON.parse(state.userPatterns);
  Object.keys(userPatterns).forEach((key) => {
    const data = userPatterns[key];
    data.id = data.id ?? key;
    data.date = data.date ?? 0;
    userPatterns[key] = data;
  });
  return {
    ...state,
    isZen: [true, 'true'].includes(state.isZen) ? true : false,
    isLineNumbersDisplayed: [true, 'true'].includes(state.isLineNumbersDisplayed) ? true : false,
    isActiveLineHighlighted: [true, 'true'].includes(state.isActiveLineHighlighted) ? true : false,
    isAutoCompletionEnabled: [true, 'true'].includes(state.isAutoCompletionEnabled) ? true : false,
    isPatternHighlightingEnabled: [true, 'true'].includes(state.isPatternHighlightingEnabled) ? true : false,
    isTooltipEnabled: [true, 'true'].includes(state.isTooltipEnabled) ? true : false,
    isLineWrappingEnabled: [true, 'true'].includes(state.isLineWrappingEnabled) ? true : false,
    isFlashEnabled: [true, 'true'].includes(state.isFlashEnabled) ? true : false,
    fontSize: Number(state.fontSize),
    panelPosition: state.activeFooter !== '' ? state.panelPosition : 'bottom', // <-- keep this 'bottom' where it is!
    userPatterns: userPatterns,
  };
}

export const setActiveFooter = (tab) => settingsMap.setKey('activeFooter', tab);

export const setLatestCode = (code) => settingsMap.setKey('latestCode', code);
export const setIsZen = (active) => settingsMap.setKey('isZen', !!active);

const patternSetting = (key) =>
  register(key, (value, pat) =>
    pat.onTrigger(() => {
      value = Array.isArray(value) ? value.join(' ') : value;
      if (value !== settingsMap.get()[key]) {
        settingsMap.setKey(key, value);
      }
      return pat;
    }, false),
  );

export const theme = patternSetting('theme');
export const fontFamily = patternSetting('fontFamily');
export const fontSize = patternSetting('fontSize');

export const settingPatterns = { theme, fontFamily, fontSize };

function getUserPatterns() {
  return JSON.parse(settingsMap.get().userPatterns);
}

function setUserPatterns(obj) {
  return settingsMap.setKey('userPatterns', JSON.stringify(obj));
}

export const createPatternID = () => {
  return nanoid(12);
};

export const getNextCloneID = (id) => {
  return createPatternID();
};

const examplePatterns = Object.fromEntries(Object.entries(tunes).map(([key, code], i) => [i, { id: i, code }]));

export const examplePattern = {
  source: 'Stock Examples',
  getAll() {
    return examplePatterns;
  },
  getPatternData(id) {
    const pats = this.getAll();
    return pats[id];
  },
  exists(id) {
    return this.getPatternData(id) != null;
  },
};

// break
export const userPattern = {
  source: 'user',
  collection: 'user',
  getAll() {
    const patterns = JSON.parse(settingsMap.get().userPatterns);
    return patterns;
  },
  getPatternData(id) {
    const userPatterns = this.getAll();
    return userPatterns[id];
  },
  exists(id) {
    return this.getPatternData(id) != null;
  },

  create() {
    const newID = createPatternID();
    const code = defaultCode;
    const data = { code, created_at: Date.now(), id: newID, collection: this.collection };
    return this.update(newID, data);
  },
  update(id, data) {
    const userPatterns = this.getAll();
    data = { ...data, id, collection: this.collection };
    setUserPatterns({ ...userPatterns, [id]: data });
    return { id, data };
  },
  duplicate(id) {
    const examplePatternData = examplePattern.getPatternData(id);
    const data = examplePatternData != null ? examplePatternData : this.getPatternData(id);
    const newID = getNextCloneID(id);
    return this.update(newID, data);
  },
  clearAll() {
    if (!confirm(`This will delete all your patterns. Are you really sure?`)) {
      return;
    }
    const viewingPattern = getViewingPattern();
    const examplePatternData = examplePattern.getPatternData(viewingPattern);
    setUserPatterns({});
    if (examplePatternData != null) {
      return { id: viewingPattern, data: examplePatternData };
    }
    // setViewingPattern(null);
    setActivePattern(null);

    return { id: null, data: { code: defaultCode, id: null, collection: this.collection } };
  },
  delete(id) {
    const userPatterns = this.getAll();
    delete userPatterns[id];
    if (getActivePattern() === id) {
      setActivePattern(null);
    }
    setUserPatterns(userPatterns);
    const viewingPattern = getViewingPattern();
    if (viewingPattern === id) {
      return { id: null, data: { code: defaultCode } };
    }
    return { id: viewingPattern, data: userPatterns[viewingPattern] };
  },

  rename(id) {
    const userPatterns = this.getAll();
    const newID = prompt('Enter new name', id);
    const data = userPatterns[id];
    if (newID === null) {
      // canceled
      return { id, data };
    }
    if (userPatterns[newID]) {
      alert('Name already taken!');
      return { id, data };
    }
    userPatterns[newID] = data; // copy code
    delete userPatterns[id];

    setUserPatterns({ ...userPatterns });
    if (id === getActivePattern()) {
      setActivePattern(newID);
    }
    return { id: newID, data };
  },
};

// export function updateUserCode(code) {
//   const userPatterns = getUserPatterns();
//   let activePattern = getActivePattern();
//   // check if code is that of an example tune
//   const [example] = Object.entries(tunes).find(([_, tune]) => tune === code) || [];
//   if (example && (!activePattern || activePattern === example)) {
//     // select example
//     setActivePattern(example);
//     return;
//   }
//   const publicPattern = $publicPatterns.get().find((pat) => pat.code === code);
//   if (publicPattern) {
//     setActivePattern(publicPattern.hash);
//     return;
//   }
//   const featuredPattern = $featuredPatterns.get().find((pat) => pat.code === code);
//   if (featuredPattern) {
//     setActivePattern(featuredPattern.hash);
//     return;
//   }
//   if (!activePattern) {
//     // create new user pattern
//     activePattern = newUserPattern();
//     setActivePattern(activePattern);
//   } else if (
//     (!!tunes[activePattern] && code !== tunes[activePattern]) || // fork example tune?
//     $publicPatterns.get().find((p) => p.hash === activePattern) || // fork public pattern?
//     $featuredPatterns.get().find((p) => p.hash === activePattern) // fork featured pattern?
//   ) {
//     // fork example
//     activePattern = getNextCloneName(activePattern);
//     setActivePattern(activePattern);
//   }
//   setUserPatterns({ ...userPatterns, [activePattern]: { code } });
// }

export async function importPatterns(fileList) {
  const files = Array.from(fileList);
  await Promise.all(
    files.map(async (file, i) => {
      const content = await file.text();
      if (file.type === 'application/json') {
        const userPatterns = getUserPatterns() || {};
        setUserPatterns({ ...userPatterns, ...JSON.parse(content) });
      } else if (file.type === 'text/plain') {
        const id = file.name.replace(/\.[^/.]+$/, '');
        userPattern.update(id, { code: content });
      }
    }),
  );
  logger(`import done!`);
}

export async function exportPatterns() {
  const userPatterns = getUserPatterns() || {};
  const blob = new Blob([JSON.stringify(userPatterns)], { type: 'application/json' });
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  downloadLink.download = `strudel_patterns_${date}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
