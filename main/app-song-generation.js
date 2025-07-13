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

    if (cleanSectionNameForStyle === "chorus") {
        if (progressionCache.chorus) {
            progressionCache.chorus.forEach(c => allGeneratedChordsSet.add(c));
            return [...progressionCache.chorus];
        }
    } else if (cleanSectionNameForStyle === "verse") {
        if (progressionCache.verse) {
            const variedVerseProg = progressionCache.verse.map(chord => normalizeChordNameToSharps(colorizeChord(chord, mood, keyInfo)));
            variedVerseProg.forEach(c => allGeneratedChordsSet.add(c));
            return variedVerseProg;
        }
    }

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

    if (cleanSectionNameForStyle === "chorus" && !progressionCache.chorus) {
        progressionCache.chorus = [...finalBaseProgression];
    } else if (cleanSectionNameForStyle === "verse" && !progressionCache.verse) {
        progressionCache.verse = [...finalBaseProgression];
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



        let selectedKey;
        if (selectedKeyOptionValue === "random") {
            selectedKey = getRandomElement(possibleKeysAndModes);
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

        let songStructureDefinition = null;
        if (selectedStructureTemplate && selectedStructureTemplate !== 'random' && typeof getSongStructure === 'function') {
            songStructureDefinition = getSongStructure(selectedStructureTemplate);
        }

        if (!songStructureDefinition) {
            const moodStructKey = mood in MOOD_SONG_STRUCTURES ? mood : "very_normal_person";
            songStructureDefinition = getRandomElement(MOOD_SONG_STRUCTURES[moodStructKey]);
            if (!songStructureDefinition || songStructureDefinition.length === 0) {
                songStructureDefinition = getSongStructure();
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
        const styleNote = (typeof moodToStyleNotes !== 'undefined' && moodToStyleNotes[mood]) ? moodToStyleNotes[mood] : "Experiment.";

        currentMidiData = {
            title: songTitle, displayTitle: displaySongTitle, bpm: bpm, timeSignatureChanges: [], sections: [],
            keySignatureRoot: selectedKey.root, keyModeName: selectedKey.mode,
            fullKeyName: selectedKey.name || (selectedKey.root + " " + selectedKey.mode),
            capriceNum: capriceNumber, totalMeasures: 0, mainScaleNotes: [], mainScaleRoot: selectedKey.root
        };

        const allGeneratedChordsSet = new Set();
        let totalSongMeasures = 0;
        const progressionCache = { verse: null, chorus: null };
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

            const baseChordProgressionForSection = generateChordsForSection(sectionNameString, selectedKey, mood, allGeneratedChordsSet, finalMeasures, activeTimeSignatureForSectionLogic, progressionCache);

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

        // --- FASE DI ARRANGIAMENTO RITMICO-ARMONICO ---
        rawMidiSectionsData.forEach(sectionData => {
            const sectionTS = sectionData.timeSignature;
            const tsKey = `${sectionTS[0]}/${sectionTS[1]}`;
            const sectionTypeForPatternLookup = getCleanSectionName(sectionData.name).replace(/-double|-mod|-quiet|-sospeso/g, ''); 
            
            const patternsForSectionType = SECTION_HARMONIC_RHYTHM_PATTERNS[tsKey]?.[sectionTypeForPatternLookup] || 
                                           SECTION_HARMONIC_RHYTHM_PATTERNS[tsKey]?.["verse"] || 
                                           SECTION_HARMONIC_RHYTHM_PATTERNS["4/4"]?.["verse"] || // Fallback globale
                                           [{ name: "DefaultWholeBar", weight: 100, pattern: [{ degree: "FROM_CHOSEN_PATTERN", durationBeats: sectionTS[0] }] }];


            let currentBaseChordIndexTracker = 0; // Traccia l'indice dell'accordo nella baseProgression
            let sectionTickOffset = 0; 
            const ticksPerBeatUnitInSection = (4 / sectionTS[1]) * TICKS_PER_QUARTER_NOTE_REFERENCE;

            for (let measureNum = 0; measureNum < sectionData.measures; measureNum++) {
                let harmonicPatternForMeasure = getRandomElement(patternsForSectionType); 
                if (!harmonicPatternForMeasure || !harmonicPatternForMeasure.pattern) { // Ulteriore fallback se getRandomElement fallisce o pattern è malformato
                    harmonicPatternForMeasure = { name: "FallbackMeasure", weight:100, pattern: [{ degree: "FROM_CHOSEN_PATTERN", durationBeats: sectionTS[0]}] };
                }
                
                let tickWithinMeasure = 0;
                const ticksInThisMeasure = sectionTS[0] * ticksPerBeatUnitInSection;
                let baseChordConsumedInMeasure = false;

                for (const patternEvent of harmonicPatternForMeasure.pattern) {
                    if (tickWithinMeasure >= ticksInThisMeasure) break; 

                    let chordNameToUse = "N/A_RhythmErr";
                    let currentEventIsPassing = false;
                    let currentEventIsHit = false;
                    let currentPatternDegree = patternEvent.degree;

                    switch (currentPatternDegree) {
                        case "FROM_CHOSEN_PATTERN":
                            if (sectionData.baseChords.length > 0) {
                                chordNameToUse = sectionData.baseChords[currentBaseChordIndexTracker % sectionData.baseChords.length];
                            } else { chordNameToUse = selectedKey.root + QUALITY_DEFS.major.suffix; } // Fallback se baseChords è vuoto
                            break;
                        case "NEXT_FROM_CHOSEN_PATTERN":
                            if (sectionData.baseChords.length > 0) {
                                currentBaseChordIndexTracker++;
                                chordNameToUse = sectionData.baseChords[currentBaseChordIndexTracker % sectionData.baseChords.length];
                                baseChordConsumedInMeasure = true;
                            } else { chordNameToUse = selectedKey.root + QUALITY_DEFS.major.suffix;}
                            break;
                        case "PREV_FROM_CHOSEN_PATTERN":
                             if (sectionData.baseChords.length > 0) {
                                let prevIndex = currentBaseChordIndexTracker -1;
                                if (prevIndex < 0 && sectionData.baseChords.length > 0) prevIndex = sectionData.baseChords.length -1; 
                                chordNameToUse = sectionData.baseChords[prevIndex % sectionData.baseChords.length];
                            } else { chordNameToUse = selectedKey.root + QUALITY_DEFS.major.suffix;}
                            break;
                        case "PASSING":
                            currentEventIsPassing = true; // Marcatore
                            // FASE 1: Tratta come continuazione, o primo accordo base se non c'è storia
                            if (sectionData.detailedHarmonicEvents.length > 0 && !sectionData.detailedHarmonicEvents[sectionData.detailedHarmonicEvents.length - 1].isPassing) {
                                chordNameToUse = sectionData.detailedHarmonicEvents[sectionData.detailedHarmonicEvents.length - 1].chordName;
                            } else if (sectionData.baseChords.length > 0) {
                                chordNameToUse = sectionData.baseChords[currentBaseChordIndexTracker % sectionData.baseChords.length];
                            } else { chordNameToUse = selectedKey.root + QUALITY_DEFS.major.suffix;}
                            break;
                        case "HIT":
                            currentEventIsHit = true; // Marcatore
                            if (sectionData.baseChords.length > 0) {
                                chordNameToUse = sectionData.baseChords[currentBaseChordIndexTracker % sectionData.baseChords.length];
                            } else { chordNameToUse = selectedKey.root + QUALITY_DEFS.major.suffix;}
                            break;
                        default:
                            if (sectionData.baseChords.length > 0) {
                                chordNameToUse = sectionData.baseChords[currentBaseChordIndexTracker % sectionData.baseChords.length];
                            } else { chordNameToUse = selectedKey.root + QUALITY_DEFS.major.suffix;}
                    }

                    const patternUnitMultiplier = patternEvent.unit || 1;
                    const actualBeatDurationForPatternUnits = ticksPerBeatUnitInSection * patternUnitMultiplier;
                    let eventDurationTicks = Math.round(patternEvent.durationBeats * actualBeatDurationForPatternUnits);
                    
                    if (tickWithinMeasure + eventDurationTicks > ticksInThisMeasure) {
                        eventDurationTicks = ticksInThisMeasure - tickWithinMeasure;
                    }
                    if (eventDurationTicks <= 0 && !currentEventIsPassing ) continue; 
                    if (eventDurationTicks <= 0 && currentEventIsPassing ){ continue; }

                    if (chordNameToUse !== "N/A_RhythmErr") {
                        sectionData.detailedHarmonicEvents.push({
                            chordName: chordNameToUse,
                            startTickInSection: sectionTickOffset + tickWithinMeasure,
                            durationTicks: eventDurationTicks,
                            isPassing: currentEventIsPassing, 
                            isHit: currentEventIsHit,
                            baseChordIndexAffiliation: currentBaseChordIndexTracker % (sectionData.baseChords.length || 1) // Per mainChordSlots
                        });
                    }
                    tickWithinMeasure += eventDurationTicks;
                }
                // Se nessun "NEXT_FROM_CHOSEN_PATTERN" ha consumato un accordo base in questa misura,
                // e la baseProgression è pensata per avere circa un accordo per battuta (o più),
                // avanziamo l'indice per la prossima battuta.
                if (!baseChordConsumedInMeasure && sectionData.baseChords.length > sectionData.measures && sectionData.baseChords.length > 0) {
                     currentBaseChordIndexTracker++;
                } else if (!baseChordConsumedInMeasure && sectionData.baseChords.length <= sectionData.measures && sectionData.baseChords.length > 0 && measureNum < sectionData.baseChords.length -1) {
                    // Se la progressione base ha un accordo per battuta (o meno)
                    // e non è stato consumato, avanziamo per la prossima battuta se ci sono ancora accordi base non "visitati"
                    currentBaseChordIndexTracker++;
                }


                sectionTickOffset += ticksInThisMeasure; 
            }

            // --- CREAZIONE di mainChordSlots ---
            if (sectionData.baseChords && sectionData.baseChords.length > 0) {
                let tempMainChordSlots = [];
                for (let i = 0; i < sectionData.baseChords.length; i++) {
                    const originalBaseChordName = sectionData.baseChords[i];
                    let firstEventForThisBaseChord = null;
                    let lastEventForThisBaseChord = null;

                    // Trova il primo e l'ultimo detailedHarmonicEvent affiliato a questo indice della baseProgression
                    for(const detailedEvent of sectionData.detailedHarmonicEvents) {
                        if (detailedEvent.baseChordIndexAffiliation === i && !detailedEvent.isPassing) { // Considera solo eventi principali
                            if (!firstEventForThisBaseChord) {
                                firstEventForThisBaseChord = detailedEvent;
                            }
                            lastEventForThisBaseChord = detailedEvent; // Continua ad aggiornare per trovare l'ultimo
                        }
                    }
                    
                    if (firstEventForThisBaseChord) {
                        let slotEndTick = sectionData.measures * sectionTS[0] * ticksPerBeatUnitInSection; // Fine della sezione
                        // Cerca l'inizio del prossimo slot di accordo principale (affiliato a i+1)
                        let nextBaseChordAffiliationIndex = (i + 1);
                        if (nextBaseChordAffiliationIndex < sectionData.baseChords.length) {
                            const firstEventOfNextSlot = sectionData.detailedHarmonicEvents.find(
                                de => de.baseChordIndexAffiliation === nextBaseChordAffiliationIndex && !de.isPassing
                            );
                            if (firstEventOfNextSlot) {
                                slotEndTick = firstEventOfNextSlot.startTickInSection;
                            }
                        }
                        // Se è l'ultimo accordo della base progression, lo slot finisce alla fine della sezione,
                        // a meno che non ci siano eventi successivi non affiliati o affiliati a indici precedenti (loop)
                        // che iniziano prima della fine della sezione.
                        // Questa logica può essere complessa se i pattern armonici fanno saltare molto gli indici base.
                        // Per ora, la fine dello slot è l'inizio del successivo slot principale o la fine della sezione.
                        
                        const slotStartTick = firstEventForThisBaseChord.startTickInSection;
                        const slotDuration = slotEndTick - slotStartTick;

                        if (slotDuration > 0) {
                             // Evita di aggiungere slot duplicati per lo stesso indice di baseChord
                            if (!tempMainChordSlots.some(s => s.originalBaseChordIndex === i)) {
                                tempMainChordSlots.push({
                                    chordName: originalBaseChordName,
                                    effectiveStartTickInSection: slotStartTick,
                                    effectiveDurationTicks: slotDuration,
                                    originalBaseChordIndex: i // Per debug o logica avanzata
                                });
                            }
                        }
                    }
                }
                // Ordina per start tick e poi per indice originale per gestire sovrapposizioni o riordini
                tempMainChordSlots.sort((a,b) => {
                    if (a.effectiveStartTickInSection !== b.effectiveStartTickInSection) {
                        return a.effectiveStartTickInSection - b.effectiveStartTickInSection;
                    }
                    return a.originalBaseChordIndex - b.originalBaseChordIndex;
                });
                
                // Raffina le durate per evitare sovrapposizioni negli slot principali
                for(let k=0; k < tempMainChordSlots.length -1; k++){
                    const currentSlot = tempMainChordSlots[k];
                    const nextSlot = tempMainChordSlots[k+1];
                    if (currentSlot.effectiveStartTickInSection + currentSlot.effectiveDurationTicks > nextSlot.effectiveStartTickInSection) {
                        currentSlot.effectiveDurationTicks = nextSlot.effectiveStartTickInSection - currentSlot.effectiveStartTickInSection;
                    }
                }
                // Assicura che l'ultimo slot non superi la durata della sezione
                if(tempMainChordSlots.length > 0) {
                    const lastSlot = tempMainChordSlots[tempMainChordSlots.length - 1];
                    const sectionEndTick = sectionData.measures * sectionTS[0] * ticksPerBeatUnitInSection;
                    if(lastSlot.effectiveStartTickInSection + lastSlot.effectiveDurationTicks > sectionEndTick) {
                        lastSlot.effectiveDurationTicks = sectionEndTick - lastSlot.effectiveStartTickInSection;
                    }
                    // Rimuovi slot con durata <=0 dopo l'aggiustamento
                    tempMainChordSlots = tempMainChordSlots.filter(slot => slot.effectiveDurationTicks > 0);
                }

                sectionData.mainChordSlots = tempMainChordSlots;

            } else {
                sectionData.mainChordSlots = []; // Nessun accordo base, nessun slot principale
            }
        });
        // --- FINE FASE DI ARRANGIAMENTO E CREAZIONE mainChordSlots ---

        currentMidiData.sections = rawMidiSectionsData; 
        currentMidiData.timeSignatureChanges = timeSignatureChanges;
        currentMidiData.totalMeasures = totalSongMeasures;

        recalculateTimeSignatureChangesAndSectionTicks(); 

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

/**
 * Ricalcola i tick di inizio per ogni sezione e i cambi di time signature.
 * Utile per assicurare coerenza prima dell'esportazione MIDI.
 * Questa funzione modifica currentMidiData.
 */
function recalculateTimeSignatureChangesAndSectionTicks() {
    if (!currentMidiData || !currentMidiData.sections) return;

    const newTimeSignatureChanges = [];
    let currentGlobalTick = 0;
    let lastPushedTsArray = null;

    currentMidiData.sections.forEach((section) => {
        section.startTick = currentGlobalTick; 
        const sectionTSArray = section.timeSignature;

        if (newTimeSignatureChanges.length === 0 ||
            (lastPushedTsArray && (sectionTSArray[0] !== lastPushedTsArray[0] || sectionTSArray[1] !== lastPushedTsArray[1]))) {
            const lastChange = newTimeSignatureChanges[newTimeSignatureChanges.length -1];
            if(!lastChange || lastChange.tick !== currentGlobalTick || lastChange.ts[0] !== sectionTSArray[0] || lastChange.ts[1] !== sectionTSArray[1]){
                newTimeSignatureChanges.push({ tick: currentGlobalTick, ts: [...sectionTSArray] });
            }
            lastPushedTsArray = [...sectionTSArray];
        }

        const beatsPerMeasureInSection = sectionTSArray[0];
        const beatUnitValueInSection = sectionTSArray[1];
        const ticksPerBeatForThisSection = (4 / beatUnitValueInSection) * TICKS_PER_QUARTER_NOTE_REFERENCE;
        currentGlobalTick += section.measures * beatsPerMeasureInSection * ticksPerBeatForThisSection;
    });

    if (newTimeSignatureChanges.length === 0 && currentMidiData.sections.length > 0) {
        newTimeSignatureChanges.push({ tick: 0, ts: [...currentMidiData.sections[0].timeSignature] });
    }
    else if (newTimeSignatureChanges.length > 0 && newTimeSignatureChanges[0].tick !== 0) {
         // Assicura che ci sia sempre un TS a tick 0
        const firstSectionTS = currentMidiData.sections.length > 0 ? currentMidiData.sections[0].timeSignature : [4,4];
        newTimeSignatureChanges.unshift({ tick: 0, ts: [...firstSectionTS] });
        // Rimuovi duplicati consecutivi o a tick 0
        for(let i = newTimeSignatureChanges.length - 1; i > 0; i--) {
            if (newTimeSignatureChanges[i].tick === newTimeSignatureChanges[i-1].tick &&
                newTimeSignatureChanges[i].ts[0] === newTimeSignatureChanges[i-1].ts[0] &&
                newTimeSignatureChanges[i].ts[1] === newTimeSignatureChanges[i-1].ts[1]) {
                newTimeSignatureChanges.splice(i, 1);
            }
        }
         // Se il primo e il secondo sono identici e il primo è a tick 0, rimuovi il secondo
        if (newTimeSignatureChanges.length > 1 && newTimeSignatureChanges[0].tick === 0 && newTimeSignatureChanges[1].tick === 0 &&
            newTimeSignatureChanges[0].ts[0] === newTimeSignatureChanges[1].ts[0] &&
            newTimeSignatureChanges[0].ts[1] === newTimeSignatureChanges[1].ts[1]) {
            newTimeSignatureChanges.splice(1,1);
        }
    }
    currentMidiData.timeSignatureChanges = newTimeSignatureChanges;

    const initialTimeSigElement = document.getElementById('initial-time-signature');
    if (initialTimeSigElement && currentMidiData.timeSignatureChanges.length > 0) {
        const firstTS = currentMidiData.timeSignatureChanges[0].ts;
        let uniqueTimeSignatures = new Set(currentMidiData.timeSignatureChanges.map(tc => `${tc.ts[0]}/${tc.ts[1]}`));
        
        if (uniqueTimeSignatures.size > 1) {
            let tsString = `Variable (starts ${firstTS[0]}/${firstTS[1]})`;
            initialTimeSigElement.innerHTML = `<strong>Meter:</strong> ${tsString}`;
        } else {
            initialTimeSigElement.innerHTML = `<strong>Meter:</strong> ${firstTS[0]}/${firstTS[1]}`;
        }
    }
}
