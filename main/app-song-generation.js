// File: main/app-song-generation.js - v1.34
// Contiene la logica principale per la generazione della struttura della canzone,
// degli accordi base, l'arrangiamento ritmico-armonico per sezione,
// e la preparazione dei 'mainChordSlots' per i generatori melodici.

/**
 * Funzione di utilità per ottenere un nome di sezione "pulito" per CSS o logica.
 * @param {string} sectionNameWithCount Nome della sezione, es. "Verse 1"
 * @returns {string} Nome pulito, es. "verse"
 */
function getCleanSectionName(sectionNameWithCount) {
    if (typeof sectionNameWithCount !== 'string') return 'default';
    return sectionNameWithCount.toLowerCase()
        .replace(/\s\d+$|\s\(\d+\)$/, '') // Rimuove numeri alla fine tipo "Verse 1" -> "Verse"
        .replace(/\s*\(double\)$/, 'double') // Gestisce "(double)" -> "chorusdouble" se attaccato
        .replace(/\s*\(modulato\)$/, 'mod')
        .replace(/\s*\(quiet\)$/, 'quiet')
        .replace(/\s*sospeso$/, 'sospeso')
        .trim()
        .replace(/[^\w-]+/g, '') // Rimuove caratteri non alfanumerici tranne - e _ (per coerenza)
        .replace(/\s+/g, '-'); // Sostituisce spazi con trattini per nomi CSS-like
}

/**
 * Normalizza un nome di accordo per usare i diesis.
 * @param {string} chordName Nome dell'accordo
 * @returns {string} Nome dell'accordo normalizzato
 */
function normalizeChordNameToSharps(chordName) {
    if (typeof chordName !== 'string' || !chordName.trim()) return chordName;
    // Assicura che le dipendenze globali siano disponibili
    if (typeof getChordRootAndType !== 'function' || typeof NOTE_NAMES === 'undefined' || typeof allNotesWithFlats === 'undefined' || typeof QUALITY_DEFS === 'undefined') {
        // console.warn("normalizeChordNameToSharps: Dipendenze globali mancanti. Restituzione input.");
        return chordName;
    }
    const { root, type } = getChordRootAndType(chordName.trim());
    if (!root) return chordName.trim(); // Se non riesce a parsare, restituisce l'originale

    const isValidSuffix = Object.values(QUALITY_DEFS).some(def => def.suffix === type.trim());
    if (!isValidSuffix && type.trim() !== "") {
        const flatIndexForRootOnly = allNotesWithFlats.indexOf(root);
        if (flatIndexForRootOnly !== -1 && NOTE_NAMES[flatIndexForRootOnly] && NOTE_NAMES[flatIndexForRootOnly] !== root) {
            return NOTE_NAMES[flatIndexForRootOnly];
        }
        return root;
    }

    const trimmedType = type.trim();

    const flatIndex = allNotesWithFlats.indexOf(root);
    if (flatIndex !== -1 && NOTE_NAMES[flatIndex] && NOTE_NAMES[flatIndex] !== root) {
        return NOTE_NAMES[flatIndex] + trimmedType;
    }
    return root + trimmedType;
}


/**
 * Genera la progressione di accordi "base" per una data sezione.
 */
function generateChordsForSection(
    sectionName,
    keyInfo,
    mood,
    allGeneratedChordsSet,
    measures,
    sectionTimeSignature,
    progressionCache
) {
    if (!keyInfo || typeof keyInfo.root === 'undefined' || typeof keyInfo.mode === 'undefined') {
        console.error(`CRITICAL ERROR in generateChordsForSection: keyInfo è invalido o incompleto per la sezione "${sectionName}". Ricevuto keyInfo:`, keyInfo);
        const fallbackChord = normalizeChordNameToSharps("C");
        allGeneratedChordsSet.add(fallbackChord);
        return [fallbackChord];
    }

    const keyRoot = keyInfo.root;
    const cleanSectionNameForStyle = getCleanSectionName(sectionName);
    const sectionCacheKey = getCleanSectionName(sectionName);

    let currentModeForDiatonicGeneration = keyInfo.mode;
    const originalScaleData = scales[keyInfo.mode];

    if (!originalScaleData) {
        currentModeForDiatonicGeneration = (keyInfo.name && keyInfo.name.toLowerCase().includes("minor")) ? 'Aeolian' : 'Ionian';
    } else if (originalScaleData.intervals && originalScaleData.intervals.length < 7) {
        currentModeForDiatonicGeneration = originalScaleData.type === 'major' ? 'Ionian' : 'Aeolian';
    }

    if (!scales[currentModeForDiatonicGeneration] || !scales[currentModeForDiatonicGeneration].intervals || scales[currentModeForDiatonicGeneration].intervals.length < 7) {
        const isMinorGuess = keyRoot.endsWith("m") ||
                             (keyInfo.name && keyInfo.name.toLowerCase().includes("minor")) ||
                             (keyInfo.name && keyInfo.name.toLowerCase().includes("aeolian")) ||
                             (keyInfo.name && keyInfo.name.toLowerCase().includes("dorian")) ||
                             (keyInfo.name && keyInfo.name.toLowerCase().includes("phrygian"));
        currentModeForDiatonicGeneration = isMinorGuess ? 'Aeolian' : 'Ionian';
    }

    const useSeventhChords = mood === "very_normal_person" ? (Math.random() < 0.3) : (Math.random() < 0.75);
    const diatonics = getDiatonicChords(keyRoot, currentModeForDiatonicGeneration, useSeventhChords);
    const fallbackTonic = keyRoot + (scales[currentModeForDiatonicGeneration]?.type === 'minor' ? QUALITY_DEFS.minor.suffix : QUALITY_DEFS.major.suffix);

    if (!diatonics || diatonics.length === 0 || diatonics.some(c => typeof c !== 'string')) {
        console.error(`generateChordsForSection: Impossibile generare accordi diatonici per ${keyRoot} ${currentModeForDiatonicGeneration}. Uso fallback: ${fallbackTonic}`);
        const normalizedFallback = normalizeChordNameToSharps(fallbackTonic);
        allGeneratedChordsSet.add(normalizedFallback);
        return [normalizedFallback];
    }

    const rn = {
        'i': diatonics[0], 'I': diatonics[0], 'ii': diatonics[1], 'II': diatonics[1],
        'iii': diatonics[2], 'III': diatonics[2], 'iv': diatonics[3], 'IV': diatonics[3],
        'v': diatonics[4], 'V': diatonics[4], 'vi': diatonics[5], 'VI': diatonics[5],
        'vii': diatonics[6], 'VII': diatonics[6]
    };
    const phrygianChords = getDiatonicChords(keyRoot, "Phrygian", useSeventhChords);
    if (phrygianChords && phrygianChords.length > 1 && typeof phrygianChords[1] === 'string') { rn['bII'] = phrygianChords[1]; }
    else { rn['bII'] = (getChordRootAndType(diatonics[1])?.root || keyRoot) + "bII_ERR"; }

    const dorianChords = getDiatonicChords(keyRoot, "Dorian", useSeventhChords);
    if (dorianChords && dorianChords.length > 3 && typeof dorianChords[3] === 'string') rn['IVDorian'] = dorianChords[3];
    else rn['IVDorian'] = (getChordRootAndType(diatonics[3])?.root || keyRoot) + "IVD_ERR";

    const lydianChords = getDiatonicChords(keyRoot, "Lydian", useSeventhChords);
    if (lydianChords && lydianChords.length > 0 && typeof lydianChords[0] === 'string') rn['ILydian'] = lydianChords[0];
    else rn['ILydian'] = (getChordRootAndType(diatonics[0])?.root || keyRoot) + "ILYD_ERR";
    if (lydianChords && lydianChords.length > 3 && typeof lydianChords[3] === 'string') rn['IV#Lydian'] = lydianChords[3];
    else rn['IV#Lydian'] = (getChordRootAndType(diatonics[3])?.root || keyRoot) + "IV#LYD_ERR";
    if (lydianChords && lydianChords.length > 1 && typeof lydianChords[1] === 'string') rn['IILydian'] = lydianChords[1];
    else rn['IILydian'] = (getChordRootAndType(diatonics[1])?.root || keyRoot) + "IILYD_ERR";

    const sectionChordParamsKey = cleanSectionNameForStyle === "bridge-mod" ? "bridge-mod" : cleanSectionNameForStyle;
    const sectionChordParams = SECTION_CHORD_TARGETS[sectionChordParamsKey] || SECTION_CHORD_TARGETS[getCleanSectionName(sectionName.split(" ")[0])] || SECTION_CHORD_TARGETS["default"];

    let targetBaseProgressionLength = typeof getRandomElement === 'function' ?
        getRandomElement( Array.from({length: sectionChordParams.typicalMax - sectionChordParams.typicalMin + 1}, (_, i) => sectionChordParams.typicalMin + i) )
        : sectionChordParams.typicalMin;
    targetBaseProgressionLength = targetBaseProgressionLength || sectionChordParams.typicalMin;

    const minObs = sectionChordParams.minObserved !== undefined ? sectionChordParams.minObserved : 1;
    const maxObs = sectionChordParams.maxObserved !== undefined ? sectionChordParams.maxObserved : 4;

    if (minObs === 0 && maxObs === 0) {
        targetBaseProgressionLength = 0;
    } else {
        targetBaseProgressionLength = Math.max(minObs, Math.min(targetBaseProgressionLength, Math.max(sectionChordParams.typicalMax, maxObs) ));
    }
    if (targetBaseProgressionLength === 0 && cleanSectionNameForStyle !== "silence") {
        targetBaseProgressionLength = 1;
    }

    if (cleanSectionNameForStyle === "silence") targetBaseProgressionLength = 0;
    targetBaseProgressionLength = Math.max(targetBaseProgressionLength, (minObs > 0 && targetBaseProgressionLength === 0 ? 1 : 0));


    let patterns = [];
    const basePopMajorPatterns = [ ['I','V','vi','IV'], ['I','IV','V','I'], ['vi','IV','I','V'], ['I','V','IV','V'], ['I','ii','IV','V'], ['I','IV','vi','V'] ];
    const basePopMinorPatterns = [ ['i','VI','III','VII'], ['i','iv','v','i'], ['i','iv','VII','i'], ['i','VI','iv','v'] ];

    if (mood === "very_normal_person") {
        patterns = scales[currentModeForDiatonicGeneration]?.type === 'major' ? basePopMajorPatterns : basePopMinorPatterns;
        if (cleanSectionNameForStyle === "bridge" || cleanSectionNameForStyle === "middle8") {
            patterns = scales[currentModeForDiatonicGeneration]?.type === 'major' ?
                [['IV','I','ii','V'], ['vi','IV','I','V'], ['IV','V','I']] :
                [['VI','III','iv','v'],['iv','VII','III','VI'],['VI','VII','i']];
        }
    } else {
        patterns = scales[currentModeForDiatonicGeneration]?.type === 'major' ?
            basePopMajorPatterns.concat([['I','iii','IV','V']]) :
            basePopMinorPatterns.concat([['i','bII','v','i']]);
        if (cleanSectionNameForStyle === "bridge" || cleanSectionNameForStyle === "middle8" || cleanSectionNameForStyle === "bridge-mod") {
            patterns = scales[currentModeForDiatonicGeneration]?.type === 'major' ?
                [['iii','vi','ii','V'], ['IV','V/IV','IV','I']] :
                [['iv','VII','III','VI'], ['bVI','bVII','i','i']];
        }
    }
    if(!patterns || patterns.length === 0) patterns = scales[currentModeForDiatonicGeneration]?.type === 'major' ? [['I']] : [['i']];

    let chosenPattern = typeof getRandomElement === 'function' ? getRandomElement(patterns.filter(p => Array.isArray(p) && p.length > 0)) : patterns[0];
    if (!chosenPattern || chosenPattern.length === 0) chosenPattern = patterns[0] || (scales[currentModeForDiatonicGeneration]?.type === 'major' ? ['I'] : ['i']);

    let baseProgressionDegrees = [];
    if (targetBaseProgressionLength === 0) {
        baseProgressionDegrees = [];
    } else if (chosenPattern && chosenPattern.length > 0) {
        for (let i = 0; i < targetBaseProgressionLength; i++) {
            baseProgressionDegrees.push(chosenPattern[i % chosenPattern.length]);
        }
    } else {
        const fallbackDeg = scales[currentModeForDiatonicGeneration]?.type === 'minor' ? 'i' : 'I';
        for (let i = 0; i < targetBaseProgressionLength; i++) baseProgressionDegrees.push(fallbackDeg);
    }

    const finalBaseProgression = baseProgressionDegrees.map(degree => {
        if (typeof degree !== 'string' || degree.trim() === '') {
            const nf = normalizeChordNameToSharps(fallbackTonic);
            allGeneratedChordsSet.add(nf);
            return nf + "_DEG_ERR";
        }
        const chordNameFromDegree = rn[degree.toLowerCase()] || rn[degree.toUpperCase()] || rn[degree] || fallbackTonic;
        let finalChord = colorizeChord(chordNameFromDegree, mood, keyInfo);

        const { root: fcRoot, type: fcTypeOriginal } = getChordRootAndType(finalChord.trim());
        if (!fcRoot) {
            const nf = normalizeChordNameToSharps(fallbackTonic);
            allGeneratedChordsSet.add(nf);
            return nf + "_FN_ERR";
        }
        const fcType = fcTypeOriginal.trim();
        let cleanedFinalChord = fcRoot + fcType;
        cleanedFinalChord = cleanedFinalChord.replace(/Lydian|Dorian|Phrygian|Aeolian|Mixolydian|Ionian|Locrian/gi, '');
        if(cleanedFinalChord.endsWith("sus4(add3)")) cleanedFinalChord = cleanedFinalChord.replace("sus4(add3)","");

        const normalizedFinalChord = normalizeChordNameToSharps(cleanedFinalChord);
        allGeneratedChordsSet.add(normalizedFinalChord);
        return normalizedFinalChord;
    });

  if (progressionCache) {
        progressionCache[sectionCacheKey] = [...finalBaseProgression];
        console.log(`Generated new progression for section ${sectionCacheKey}:`, finalBaseProgression);
    }
    return finalBaseProgression;
}


/**
 * Funzione principale per generare l'architettura della canzone.
 * Modificata per includere la fase di "Arrangiamento Ritmico-Armonico"
 * e la creazione di 'mainChordSlots'.
 */
async function generateSongArchitecture() {
    const generateButton = document.getElementById('generateButton');
    const songOutputDiv = document.getElementById('songOutput');

    if (generateButton) { generateButton.disabled = true; generateButton.textContent = 'Generating...'; }
    songOutputDiv.innerHTML = '<p><em>Generating your sonic architecture...</em></p>';
    currentSongDataForSave = null; currentMidiData = {};
    glossaryChordData = {};

    if (midiSectionTitleElement) midiSectionTitleElement.style.display = 'none';
    const actionButtonIDs = [
        'saveSongButton', 'downloadSingleTrackChordMidiButton', 'generateChordRhythmButton',
        'generateMelodyButton', 'generateVocalLineButton', 'generateBassLineButton', 'generateDrumTrackButton'
    ];
    actionButtonIDs.forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.style.display = 'none';
    });

    let capriceNumber = Math.floor(Math.random() * 999) + 1;

    try {
        const mood = document.getElementById('mood').value;
        const tempoFeeling = document.getElementById('tempo_feeling').value;
        const selectedKeyOptionValue = document.getElementById('keySelection').value;
        const forcedTimeSignatureValue = document.getElementById('forceTimeSignature').value;
        const selectedStructureTemplate = document.getElementById('songStructure') ? document.getElementById('songStructure').value : 'random';



        const moodProfile = MOOD_PROFILES[mood] || MOOD_PROFILES["very_normal_person"];

        let selectedKey;
        if (selectedKeyOptionValue === "random") {
            const allowedScales = moodProfile.scales;
            const filteredKeys = possibleKeysAndModes.filter(k => allowedScales.includes(k.mode));
            selectedKey = getRandomElement(filteredKeys.length > 0 ? filteredKeys : possibleKeysAndModes);
        } else {
            const parts = selectedKeyOptionValue.split('_');
            selectedKey = possibleKeysAndModes.find(k => k.root === parts[0] && k.mode === parts[1]) || getRandomElement(possibleKeysAndModes);
        }
        if (!selectedKey || typeof selectedKey.root === 'undefined' || typeof selectedKey.mode === 'undefined') {
            console.error("ERRORE: Tonalità selezionata non valida.", selectedKey);
            songOutputDiv.innerHTML = "<p>Errore: Tonalità non valida. Prova con 'Random'.</p>";
            if (generateButton) { generateButton.disabled = false; generateButton.textContent = 'Generate';} return;
        }

               const bpm = generateBPM(tempoFeeling);

        let songStructureDefinition = getSongStructure(selectedStructureTemplate, mood);

        if (!songStructureDefinition) {
            // Fallback se getSongStructure non restituisce una struttura valida
            songStructureDefinition = getSongStructure('random', mood); // Prova a prenderne una casuale per quel mood
            if (!songStructureDefinition) {
                 // Ultimate fallback a una struttura di default
                songStructureDefinition = ["Intro", "Verse", "Chorus", "Outro"];
            }
        }

        let timeSignatureChanges = [];
        let activeTimeSignatureForSectionLogic = [4,4];

        if (forcedTimeSignatureValue !== "random") {
            const tsParts = forcedTimeSignatureValue.split('/');
            activeTimeSignatureForSectionLogic = [parseInt(tsParts[0]), parseInt(tsParts[1])];
            timeSignatureChanges = [{ tick: 0, ts: [...activeTimeSignatureForSectionLogic] }];
        } else {
            const moodTimeSignaturesPool = TIME_SIGNATURES_BY_MOOD[mood] || TIME_SIGNATURES_BY_MOOD["very_normal_person"];
            let cumulativeProb = 0;
            const randomChoiceForBaseTS = Math.random();
            for (const tsOpt of moodTimeSignaturesPool) {
                cumulativeProb += tsOpt.probability;
                if (randomChoiceForBaseTS < cumulativeProb) {
                    activeTimeSignatureForSectionLogic = [...tsOpt.ts];
                    break;
                }
            }
            if (!activeTimeSignatureForSectionLogic || activeTimeSignatureForSectionLogic.length !== 2) activeTimeSignatureForSectionLogic = [4,4];
            timeSignatureChanges = [{ tick: 0, ts: [...activeTimeSignatureForSectionLogic] }];
        }

        const songTitle = `Phalbo Caprice n ${capriceNumber}`;
        const displaySongTitle = `Phalbo Caprice n ${capriceNumber}`;
        const styleNote = moodProfile.styleNotes || "Experiment.";

        currentMidiData = {
            title: songTitle, displayTitle: displaySongTitle, bpm: bpm, timeSignatureChanges: [], sections: [],
            keySignatureRoot: selectedKey.root, keyModeName: selectedKey.mode,
            fullKeyName: selectedKey.name || (selectedKey.root + " " + selectedKey.mode),
            capriceNum: capriceNumber, totalMeasures: 0, mainScaleNotes: [], mainScaleRoot: selectedKey.root
        };

        const allGeneratedChordsSet = new Set();
        let totalSongMeasures = 0;
        const progressionCache = {};
        let currentGlobalTickForTS = 0;
        const rawMidiSectionsData = [];

        songStructureDefinition.forEach((sectionNameString, sectionIndex) => {
            if(typeof sectionNameString !== 'string'){ console.error("Nome sezione non valido: ", sectionNameString); return; }

            let currentSectionTSForLogic = [...activeTimeSignatureForSectionLogic];
            if (forcedTimeSignatureValue === "random" && sectionIndex > 0) {
                const currentMoodTSOptions = TIME_SIGNATURES_BY_MOOD[mood] || TIME_SIGNATURES_BY_MOOD["very_normal_person"];
                const prevTSDefinition = currentMoodTSOptions.find(opt =>
                    opt.ts[0] === activeTimeSignatureForSectionLogic[0] && opt.ts[1] === activeTimeSignatureForSectionLogic[1]
                ) || currentMoodTSOptions[0];
                if (Math.random() < (prevTSDefinition.sectionChangeProbability || 0) && prevTSDefinition.allowedNext && prevTSDefinition.allowedNext.length > 0) {
                    currentSectionTSForLogic = getRandomElement(prevTSDefinition.allowedNext) || currentSectionTSForLogic;
                }
            }
            activeTimeSignatureForSectionLogic = [...currentSectionTSForLogic];

            const lastRegisteredTSChange = timeSignatureChanges[timeSignatureChanges.length - 1];
            if (!lastRegisteredTSChange || currentGlobalTickForTS > lastRegisteredTSChange.tick ||
                (activeTimeSignatureForSectionLogic[0] !== lastRegisteredTSChange.ts[0] || activeTimeSignatureForSectionLogic[1] !== lastRegisteredTSChange.ts[1])) {
                 if (!(currentGlobalTickForTS === 0 && timeSignatureChanges.length > 0 &&
                      activeTimeSignatureForSectionLogic[0] === timeSignatureChanges[0].ts[0] &&
                      activeTimeSignatureForSectionLogic[1] === timeSignatureChanges[0].ts[1] &&
                      timeSignatureChanges.length === 1 )) {
                    timeSignatureChanges.push({ tick: currentGlobalTickForTS, ts: [...activeTimeSignatureForSectionLogic] });
                }
            }

            const cleanSectionNameForLogic = getCleanSectionName(sectionNameString);
            const durationParams = SECTION_DURATION_GUIDELINES[cleanSectionNameForLogic] || SECTION_DURATION_GUIDELINES[getCleanSectionName(sectionNameString.split(" ")[0])] ||SECTION_DURATION_GUIDELINES["default"];
            const measures = typeof getRandomElement === 'function' ?
                getRandomElement( Array.from({length: durationParams.typicalMax - durationParams.typicalMin + 1}, (_, i) => durationParams.typicalMin + i) )
                : durationParams.typicalMin;
            const finalMeasures = measures || durationParams.typicalMin;
            totalSongMeasures += finalMeasures;

        const baseChordProgressionForSection = generateChordsForSection(
                sectionNameString,
                selectedKey,
                mood,
                allGeneratedChordsSet,
                finalMeasures,
                activeTimeSignatureForSectionLogic,
                progressionCache,
                { varyChance: 0.05 }
            );

            rawMidiSectionsData.push({
                name: sectionNameString,
                baseChords: baseChordProgressionForSection,
                measures: finalMeasures,
                timeSignature: [...activeTimeSignatureForSectionLogic],
                startTick: currentGlobalTickForTS,
                id: `section-${sectionIndex}`,
                detailedHarmonicEvents: [],
                mainChordSlots: [] // Aggiunto per i generatori melodici
            });

            const beatsPerMeasureInSection = activeTimeSignatureForSectionLogic[0];
            const beatUnitValueInSection = activeTimeSignatureForSectionLogic[1];
            const ticksPerBeatForThisSection = (4 / beatUnitValueInSection) * TICKS_PER_QUARTER_NOTE_REFERENCE;
            currentGlobalTickForTS += finalMeasures * beatsPerMeasureInSection * ticksPerBeatForThisSection;
        });

        // --- FASE DI CREAZIONE DEI mainChordSlots (Logica Semplificata) ---
        rawMidiSectionsData.forEach(sectionData => {
            const ticksPerBar = (4 / sectionData.timeSignature[1]) * sectionData.timeSignature[0] * TICKS_PER_QUARTER_NOTE_REFERENCE;

            for (let i = 0; i < sectionData.measures; i++) {
                const chordIndex = Math.min(i, sectionData.baseChords.length - 1);
                if (sectionData.baseChords.length > 0) {
                    sectionData.mainChordSlots.push({
                        chordName: sectionData.baseChords[chordIndex],
                        effectiveStartTickInSection: i * ticksPerBar,
                        effectiveDurationTicks: ticksPerBar,
                        timeSignature: sectionData.timeSignature,
                        sectionStartTick: sectionData.startTick
                    });
                }
            }
        });
        // --- FINE FASE DI CREAZIONE mainChordSlots ---

        currentMidiData.sections = rawMidiSectionsData;
        currentMidiData.timeSignatureChanges = timeSignatureChanges;
        currentMidiData.totalMeasures = totalSongMeasures;

        const mainScaleText = getScaleNotesText(selectedKey.root, selectedKey.mode);
        const mainScaleParts = mainScaleText.split(':'); let mainScaleParsedNotes = []; let mainScaleParsedRoot = selectedKey.root; let mainScaleParsedName = selectedKey.mode;
        if (mainScaleParts.length === 2) {
            const nameAndRootPart = mainScaleParts[0].trim();
            const notesStringPart = mainScaleParts[1].trim();
            mainScaleParsedNotes = notesStringPart.split(' - ').map(n => n.trim());
            const rootMatch = nameAndRootPart.match(/^([A-G][#b]?)/);
            if (rootMatch && rootMatch[0]) {
                mainScaleParsedRoot = rootMatch[0];
                mainScaleParsedName = nameAndRootPart.substring(mainScaleParsedRoot.length).trim();
                if (mainScaleParsedName.includes("(")) {
                    mainScaleParsedName = mainScaleParsedName.substring(0, mainScaleParsedName.indexOf("(")).trim();
                }
            } else { mainScaleParsedName = nameAndRootPart; }
        } else {
            if (typeof scales !== 'undefined' && scales[selectedKey.mode] && scales[selectedKey.mode].intervals) {
                let rootIdx = NOTE_NAMES.indexOf(selectedKey.root);
                let useFlatsForDefault = ["F","Bb","Eb","Ab","Db","Gb"].includes(selectedKey.root) || selectedKey.root.includes("b");
                if (rootIdx === -1 && typeof allNotesWithFlats !== 'undefined') {
                    const sharpEquivalent = {"Db":"C#", "Eb":"D#", "Gb":"F#", "Ab":"G#", "Bb":"A#"}[selectedKey.root];
                    if (sharpEquivalent) rootIdx = NOTE_NAMES.indexOf(sharpEquivalent);
                    else rootIdx = allNotesWithFlats.indexOf(selectedKey.root);
                }
                if (rootIdx !== -1 && typeof getNoteName === "function") {
                    mainScaleParsedNotes = scales[selectedKey.mode].intervals.map(interval => getNoteName(rootIdx + interval, useFlatsForDefault));
                }
            }
        }
        currentMidiData.mainScaleNotes = mainScaleParsedNotes;
        currentMidiData.mainScaleRoot = mainScaleParsedRoot;

        if (typeof renderSongOutput === "function") {
            renderSongOutput(currentMidiData, allGeneratedChordsSet, styleNote, mainScaleText, mainScaleParsedNotes, mainScaleParsedRoot, mainScaleParsedName);
        } else {
            songOutputDiv.innerHTML = "<p>Errore: Funzione di rendering UI non trovata.</p>";
        }

        if (typeof updateEstimatedSongDuration === "function") {
            updateEstimatedSongDuration();
        }
      if (typeof buildSongDataForTextFile === "function") {
            buildSongDataForTextFile();
        }

        console.log("Progression cache during generation:", progressionCache);

        if (midiSectionTitleElement) midiSectionTitleElement.style.display = 'block';
        actionButtonIDs.forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.style.display = 'block';
        });

        if (typeof window.attachActionListenersGlobal === "function") {
             window.attachActionListenersGlobal();
        }

    } catch (error) {
        console.error("ERRORE CRITICO durante la generazione dell'architettura:", error, error.stack);
        songOutputDiv.innerHTML = `<p>Errore critico: ${error.message}. Controlla la console.</p>`;
    } finally {
        if (generateButton) { generateButton.disabled = false; generateButton.textContent = 'Generate'; }
    }
}

function applyProgressionVariation(baseProgression, mood, keyInfo) {
    if (!Array.isArray(baseProgression) || baseProgression.length === 0) return baseProgression;
    const newProg = [...baseProgression];
    if (Math.random() < 0.5) {
        // Vary length by adding or removing last chord
        if (Math.random() < 0.5 && newProg.length > 1) {
            newProg.pop();
        } else {
            const lastChord = newProg[newProg.length - 1];
            newProg.push(lastChord);
        }
    } else {
        // Vary final chord quality
        const lastChord = newProg[newProg.length - 1];
        newProg[newProg.length - 1] = normalizeChordNameToSharps(colorizeChord(lastChord, mood, keyInfo));
    }
    return newProg;
}
