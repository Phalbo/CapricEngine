// File: gen/melody-generator.js
// Genera una traccia melodica "Fake Inspiration" per la canzone.
// Modificato per utilizzare section.mainChordSlots per durate accurate degli accordi.

if (typeof require !== 'undefined') {
    require('../lib/config-music-data.js');
}


const TPQN_MELODY =
    typeof TICKS_PER_QUARTER_NOTE_REFERENCE !== 'undefined'
        ? TICKS_PER_QUARTER_NOTE_REFERENCE
        : 128;

// Parametri di generazione melodia (possono essere esposti o ulteriormente configurati)
const MELODY_GENERATION_PARAMS = {
    octaveBase: 4, // C4 come riferimento per l'ottava
    octaveRange: 1.5, // Escursione melodica in ottave
    shortNoteDurationTicks: TPQN_MELODY / 2, // Croma
    mediumNoteDurationTicks: TPQN_MELODY,   // Semiminima
    longNoteDurationTicks: TPQN_MELODY * 2, // Minima
    restProbability: 0.05, // Probabilità di inserire una pausa (ridotta)
    noteDensity: 0.8, // Fattore di densità delle note (0-1, aumentato)
    maxStepInterval: 4, // Massimo intervallo (in semitoni) per salti melodici comuni
    leapProbability: 0.2, // Probabilità di un salto melodico più ampio
    rhythmicVarietyPatterns: [ // Durate in multipli di croma (TPQN_MELODY / 2)        [2],       // Semiminima
        [1, 1],    // Due crome
        [3, 1],    // Semiminima puntata + Croma
        [1, 3],    // Croma + Semiminima puntata
        [2, 1, 1], // Semiminima + Due crome
        [1, 1, 2], // Due crome + Semiminima
        [1, 2, 1], // Croma + Semiminima + Croma
        [4]        // Minima
    ]
};

/**
 * Funzione principale per generare la melodia per l'intera canzone.
 * Utilizza songMidiData.sections[i].mainChordSlots per le durate degli accordi.
 */
function generateMelodyForSong(songMidiData, mainScaleNotes, mainScaleRoot, CHORD_LIB_GLOBAL, scales_GLOBAL, NOTE_NAMES_GLOBAL, allNotesWithFlats_GLOBAL, getChordNotes_GLOBAL, getNoteName_GLOBAL, getRandomElement_GLOBAL, getChordRootAndType_GLOBAL) {
    const melodyEvents = [];
    if (!songMidiData || !songMidiData.sections || !mainScaleNotes || mainScaleNotes.length === 0) {
        console.warn("generateMelodyForSong: Dati canzone o scala principale mancanti.");
        return melodyEvents;
    }

    const scaleNoteIndices = mainScaleNotes.map(noteName => {
        let pitch = NOTE_NAMES_GLOBAL.indexOf(noteName);
        if (pitch === -1) {
            const sharpMap = { "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", "Ab": "G#", "Bb": "A#" };
            pitch = NOTE_NAMES_GLOBAL.indexOf(sharpMap[noteName] || noteName);
        }
        return pitch;
    }).filter(p => p !== -1);

    if (scaleNoteIndices.length === 0) {
        console.warn("generateMelodyForSong: Impossibile mappare le note della scala a indici MIDI.");
        return melodyEvents;
    }
    
    const minPitch = (MELODY_GENERATION_PARAMS.octaveBase - Math.floor(MELODY_GENERATION_PARAMS.octaveRange / 2)) * 12 + scaleNoteIndices[0];
    const maxPitch = minPitch + Math.ceil(MELODY_GENERATION_PARAMS.octaveRange * 12);

    let lastMelodyNotePitch = null; // Per tracciare l'ultima nota e favorire movimenti congiunti

    songMidiData.sections.forEach(sectionData => {
        if (!sectionData.mainChordSlots || sectionData.mainChordSlots.length === 0) {
            // Se non ci sono mainChordSlots (es. sezione di silenzio), non fare nulla per questa sezione.
            return;
        }

        sectionData.mainChordSlots.forEach(chordSlot => {
            const chordName = chordSlot.chordName;
            const slotStartTickAbsolute = sectionData.startTick + chordSlot.effectiveStartTickInSection;
            const slotDurationTicks = chordSlot.effectiveDurationTicks;

            if (slotDurationTicks <= 0) return;

            const chordInfo = getChordRootAndType_GLOBAL(chordName);
            const chordNotesRaw = getChordNotes_GLOBAL(chordInfo.root, chordInfo.type, CHORD_LIB_GLOBAL);
            let chordToneIndices = [];
            if (chordNotesRaw && chordNotesRaw.notes) {
                 chordToneIndices = chordNotesRaw.notes.map(noteName => {
                    let pitch = NOTE_NAMES_GLOBAL.indexOf(noteName);
                     if (pitch === -1) {
                        const sharpMap = { "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", "Ab": "G#", "Bb": "A#" };
                        pitch = NOTE_NAMES_GLOBAL.indexOf(sharpMap[noteName] || noteName);
                    }
                    return pitch;
                }).filter(p => p !== -1);
            }
            
            // Combina note della scala e note dell'accordo, dando priorità alle note dell'accordo
            let availableNotesForSlot = [...new Set([...chordToneIndices, ...scaleNoteIndices])].sort((a, b) => a - b);
            if (availableNotesForSlot.length === 0) {
                availableNotesForSlot = [...scaleNoteIndices]; // Fallback alla scala se l'accordo non ha note mappabili
            }
            if (availableNotesForSlot.length === 0) return; // Ancora nessun suono, salta


            let currentTickInSlot = 0;
            let attemptsInSlot = 0; // Per evitare loop infiniti se non si riesce a riempire lo slot
            const maxAttemptsPerSlot = slotDurationTicks / MELODY_GENERATION_PARAMS.shortNoteDurationTicks * 2;


          while (currentTickInSlot < slotDurationTicks && attemptsInSlot < maxAttemptsPerSlot) {
                attemptsInSlot++;

                if (Math.random() < MELODY_GENERATION_PARAMS.restProbability && currentTickInSlot > 0) {
                    // Inserisci una pausa ma evita che consumi l'intero slot
                    const restChoices = [MELODY_GENERATION_PARAMS.shortNoteDurationTicks, MELODY_GENERATION_PARAMS.mediumNoteDurationTicks];
                    let restDuration = getRandomElement_GLOBAL(restChoices);
                    const remainingTicks = slotDurationTicks - currentTickInSlot;
                    if (restDuration >= remainingTicks) {
                        // Mantieni qualche tick per una nota finale, a meno di rara eccezione
                        if (Math.random() > 0.2) {
                            restDuration = Math.max(0, remainingTicks - MELODY_GENERATION_PARAMS.shortNoteDurationTicks);
                        }
                    }
                    currentTickInSlot += Math.min(restDuration, remainingTicks);
                    if (currentTickInSlot >= slotDurationTicks) break;
                    continue;
                }

                // Scegli un pattern ritmico
                const rhythmicPatternTicks = getRandomElement_GLOBAL(MELODY_GENERATION_PARAMS.rhythmicVarietyPatterns)
                                            .map(d => d * MELODY_GENERATION_PARAMS.shortNoteDurationTicks); // Converte in ticks

                let tickInRhythmicPattern = 0;
                for (let noteDurationInTicks of rhythmicPatternTicks) {
                    if (currentTickInSlot + tickInRhythmicPattern >= slotDurationTicks) break;

                    let actualNoteDuration = noteDurationInTicks;
                    if (currentTickInSlot + tickInRhythmicPattern + actualNoteDuration > slotDurationTicks) {
                        actualNoteDuration = slotDurationTicks - (currentTickInSlot + tickInRhythmicPattern);
                    }
                    if (actualNoteDuration < MELODY_GENERATION_PARAMS.shortNoteDurationTicks / 2) continue; // Durata troppo breve

                    // Scegli una nota
                    let targetPitch;
                    if (lastMelodyNotePitch !== null && Math.random() > MELODY_GENERATION_PARAMS.leapProbability) {
                        // Prova movimento congiunto o piccolo salto
                        const possibleNextPitches = availableNotesForSlot.map(noteIdx => {
                            // Considera note in diverse ottave vicine a lastMelodyNotePitch
                            const baseCandidate = noteIdx + MELODY_GENERATION_PARAMS.octaveBase * 12;
                            return [baseCandidate - 12, baseCandidate, baseCandidate + 12];
                        }).flat().filter(p => p >= minPitch && p <= maxPitch);
                        
                        let closestPitches = possibleNextPitches
                            .map(p => ({ pitch: p, diff: Math.abs(p - lastMelodyNotePitch) }))
                            .filter(p => p.diff <= MELODY_GENERATION_PARAMS.maxStepInterval)
                            .sort((a, b) => a.diff - b.diff);
                        
                        targetPitch = closestPitches.length > 0 ? getRandomElement_GLOBAL(closestPitches.slice(0, Math.min(3, closestPitches.length))).pitch : null;
                    }
                    
                    if (!targetPitch) { // Se non trovato con movimento congiunto o è un salto
                        const pitchCandidates = availableNotesForSlot.map(noteIdx => {
                            const baseCandidate = noteIdx + MELODY_GENERATION_PARAMS.octaveBase * 12;
                             // Prova ottava base, una sopra, una sotto
                            return [baseCandidate, baseCandidate + 12, baseCandidate -12];
                        }).flat().filter(p => p >= minPitch && p <= maxPitch);

                        targetPitch = pitchCandidates.length > 0 ? getRandomElement_GLOBAL(pitchCandidates) : null;
                    }

                    if (targetPitch !== null) {
                        melodyEvents.push({
                            pitch: [targetPitch],
                            duration: `T${Math.round(actualNoteDuration)}`,
                            startTick: slotStartTickAbsolute + currentTickInSlot + tickInRhythmicPattern,
                            velocity: Math.floor(60 + Math.random() * 20) // Velocity variabile
                        });
                        lastMelodyNotePitch = targetPitch;
                    }
                    tickInRhythmicPattern += actualNoteDuration;
                }
     currentTickInSlot += tickInRhythmicPattern;
                if (rhythmicPatternTicks.length === 0) currentTickInSlot = slotDurationTicks; // Per uscire dal loop se il pattern è vuoto
            }

            // Riempie eventuali tick rimanenti nello slot con note brevi
            while (currentTickInSlot < slotDurationTicks) {
                const remaining = slotDurationTicks - currentTickInSlot;
                const noteDur = Math.min(MELODY_GENERATION_PARAMS.shortNoteDurationTicks, remaining);
                if (noteDur <= 0) break;

                const pitchCandidates = availableNotesForSlot.map(idx => idx + MELODY_GENERATION_PARAMS.octaveBase * 12);
                const targetPitch = getRandomElement_GLOBAL(pitchCandidates);
                melodyEvents.push({
                    pitch: [targetPitch],
                    duration: `T${Math.round(noteDur)}`,
                    startTick: slotStartTickAbsolute + currentTickInSlot,
                    velocity: Math.floor(60 + Math.random() * 20)
                });
                lastMelodyNotePitch = targetPitch;
                currentTickInSlot += noteDur;
            }
        });
    });

    return melodyEvents;
}
