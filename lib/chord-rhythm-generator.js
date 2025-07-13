// File: lib/chord-rhythm-generator.js
// Genera eventi MIDI ritmici per un accordo, basati su pattern.
// Modificato per accettare un 'slotContext' opzionale per operare su un singolo slot armonico.

const CHORD_RHYTHM_PATTERNS = {
    "4/4": [
        { name: "EighthNotes", weight: 20, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "QuarterNotes", weight: 30, pattern: [{ duration: "4n" }, { duration: "4n" }, { duration: "4n" }, { duration: "4n" }] },
        { name: "HalfNotes", weight: 15, pattern: [{ duration: "2n" }, { duration: "2n" }] },
        { name: "WholeNote", weight: 10, pattern: [{ duration: "1n" }] },
        { name: "Syncopated1", weight: 15, pattern: [{ duration: "8n" }, { duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "4n" }] }, // 1/8 + 1/4 + 1/8 + 1/4 + 1/4 = 1 bar
        { name: "Syncopated2", weight: 10, pattern: [{ duration: "4n." }, { duration: "8n" }, { duration: "2n" }] } // 3/8 + 1/8 + 1/2 = 1 bar
    ],
    "3/4": [
        { name: "QuarterNotes", weight: 40, pattern: [{ duration: "4n" }, { duration: "4n" }, { duration: "4n" }] },
        { name: "EighthNotes", weight: 25, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "DottedHalf", weight: 20, pattern: [{ duration: "2n." }] },
        { name: "WaltzFeel", weight: 15, pattern: [{ duration: "4n" }, { duration: "2n" }] }
    ],
    "6/8": [
        { name: "EighthNotes", weight: 35, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "DottedQuarters", weight: 30, pattern: [{ duration: "4n." }, { duration: "4n." }] },
        { name: "CompoundFeel1", weight: 20, pattern: [{ duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }] },
        { name: "CompoundFeel2", weight: 15, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "4n." }, { duration: "8n" }] } // Added one more 8n to complete
    ],
    "2/4": [
        { name: "QuarterNotes", weight: 50, pattern: [{ duration: "4n" }, { duration: "4n" }] },
        { name: "EighthNotes", weight: 30, pattern: [{ duration: "8n" }, { duration: "8n" }, { duration: "8n" }, { duration: "8n" }] },
        { name: "HalfNote", weight: 20, pattern: [{ duration: "2n" }] }
    ],
    "12/8": [
        { name: "EighthNotes", weight: 30, pattern: Array(12).fill({ duration: "8n" }) },
        { name: "DottedQuarters", weight: 25, pattern: [{ duration: "4n." }, { duration: "4n." }, { duration: "4n." }, { duration: "4n." }] },
        { name: "ShuffleFeel", weight: 25, pattern: [{ duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }, { duration: "4n" }, { duration: "8n" }] },
        { name: "LongAndShort", weight: 20, pattern: [{ duration: "2n." }, { duration: "2n." }] } // 2 x (6/8)
    ],
    // Fallback for other time signatures - can be expanded
    "default": [
        { name: "QuarterNotesGeneric", weight: 100, pattern: [{ duration: "4n" }] } // Repeats to fill
    ]
};

const MIDI_DURATION_TO_TICKS = {
    "1n": TICKS_PER_QUARTER_NOTE_REFERENCE * 4,   // Whole note
    "2n": TICKS_PER_QUARTER_NOTE_REFERENCE * 2,   // Half note
    "2n.": TICKS_PER_QUARTER_NOTE_REFERENCE * 3,  // Dotted half note
    "4n": TICKS_PER_QUARTER_NOTE_REFERENCE * 1,   // Quarter note
    "4n.": TICKS_PER_QUARTER_NOTE_REFERENCE * 1.5, // Dotted quarter note
    "8n": TICKS_PER_QUARTER_NOTE_REFERENCE * 0.5, // Eighth note
    "8n.": TICKS_PER_QUARTER_NOTE_REFERENCE * 0.75,// Dotted eighth note
    "16n": TICKS_PER_QUARTER_NOTE_REFERENCE * 0.25 // Sixteenth note
};


/**
 * Genera eventi MIDI ritmici per un accordo o una serie di accordi.
 * @param {object} songMidiData - Dati MIDI della canzone, inclusi sezioni, accordi base, BPM.
 * @param {object} CHORD_LIB_GLOBAL - La libreria degli accordi (CHORD_LIB).
 * @param {string[]} NOTE_NAMES_GLOBAL - Array dei nomi delle note (NOTE_NAMES).
 * @param {object} helpers - Oggetto contenente funzioni di utilità (getRandomElement, getChordNotes, ecc.).
 * @param {object} [slotContext=null] - Contesto opzionale per operare su un singolo slot armonico.
 * Formato: { chordName, startTickAbsolute, durationTicks, timeSignature }
 * @returns {Array} Array di eventi MIDI (formato NoteEvent di MidiWriter.js).
 */
function generateChordRhythmEvents(songMidiData, CHORD_LIB_GLOBAL, NOTE_NAMES_GLOBAL, helpers, slotContext = null) {
    const rhythmicEvents = [];
    if (!helpers || typeof helpers.getRandomElement !== 'function' || typeof helpers.getChordNotes !== 'function') {
        console.error("generateChordRhythmEvents: Helpers mancanti o incompleti.");
        return rhythmicEvents;
    }

    if (slotContext && slotContext.chordName && typeof slotContext.startTickAbsolute === 'number' && typeof slotContext.durationTicks === 'number' && slotContext.timeSignature) {
        // --- Modalità Slot Singolo ---
        const { chordName, startTickAbsolute, durationTicks: slotDurationTicks, timeSignature: slotTimeSignature } = slotContext;
        
        const chordDefinition = CHORD_LIB_GLOBAL[chordName] || helpers.getChordNotes(helpers.getChordRootAndType(chordName).root, helpers.getChordRootAndType(chordName).type);
        if (!chordDefinition || !chordDefinition.notes || chordDefinition.notes.length === 0) {
            // console.warn(`generateChordRhythmEvents (slot): Definizione accordo non trovata o note mancanti per ${chordName}`);
            return rhythmicEvents; // Nessuna nota da suonare
        }

        const midiNoteNumbers = chordDefinition.notes.map(noteName => {
            let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
            if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
            let pitch = NOTE_NAMES_GLOBAL.indexOf(note);
            if (pitch === -1) { // Prova a mappare bemolli a diesis se non trovato
                const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                const mappedNote = sharpMap[noteName];
                if(mappedNote) pitch = NOTE_NAMES_GLOBAL.indexOf(mappedNote);
                else pitch = NOTE_NAMES_GLOBAL.indexOf(noteName); // Ultimo tentativo
            }
            return (pitch !== -1) ? pitch + 48 : null; // Ottava C3, o più bassa se necessario
        }).filter(n => n !== null);

        if (midiNoteNumbers.length === 0) return rhythmicEvents;

        const tsKey = `${slotTimeSignature[0]}/${slotTimeSignature[1]}`;
        const availablePatternsForTS = CHORD_RHYTHM_PATTERNS[tsKey] || CHORD_RHYTHM_PATTERNS["default"];
        
        let currentTickInSlot = 0;
        while (currentTickInSlot < slotDurationTicks) {
            const chosenRhythmPatternDef = helpers.getRandomElement(availablePatternsForTS);
            if (!chosenRhythmPatternDef || !chosenRhythmPatternDef.pattern) continue;

            for (const rhythmEvent of chosenRhythmPatternDef.pattern) {
                if (currentTickInSlot >= slotDurationTicks) break;

                const eventDurationTicks = MIDI_DURATION_TO_TICKS[rhythmEvent.duration] || TICKS_PER_QUARTER_NOTE_REFERENCE;
                let actualDurationTicks = eventDurationTicks;

                if (currentTickInSlot + eventDurationTicks > slotDurationTicks) {
                    actualDurationTicks = slotDurationTicks - currentTickInSlot;
                }
                if (actualDurationTicks <= 0) continue;

                rhythmicEvents.push({
                    pitch: midiNoteNumbers,
                    duration: `T${Math.round(actualDurationTicks)}`,
                    startTick: startTickAbsolute + currentTickInSlot,
                    velocity: 65 // Velocity leggermente diversa per distinguerli dai pad
                });
                currentTickInSlot += actualDurationTicks;
            }
            if (availablePatternsForTS.length === 1 && chosenRhythmPatternDef.pattern.every(p => p.duration === "4n")) { // Evita loop infinito con default
                 if (currentTickInSlot < slotDurationTicks && MIDI_DURATION_TO_TICKS["4n"] > 0) {
                     // Aggiungi un ultimo colpo se c'è spazio, per default pattern
                    let lastHitDuration = slotDurationTicks - currentTickInSlot;
                    if (lastHitDuration > MIDI_DURATION_TO_TICKS["16n"]) { // Minima durata sensata
                        rhythmicEvents.push({
                            pitch: midiNoteNumbers,
                            duration: `T${Math.round(lastHitDuration)}`,
                            startTick: startTickAbsolute + currentTickInSlot,
                            velocity: 65
                        });
                    }
                 }
                break; 
            }
        }

    } else if (songMidiData && songMidiData.sections) {
        // --- Modalità Originale (Itera su sezioni e accordi base) ---
        // Questa parte è mantenuta per potenziale retrocompatibilità o usi futuri,
        // ma il flusso principale con detailedHarmonicEvents userà la modalità slot singolo.
        songMidiData.sections.forEach(sectionData => {
            const sectionStartTick = sectionData.startTick || 0;
            const sectionTS = sectionData.timeSignature || [4, 4];
            const tsKey = `${sectionTS[0]}/${sectionTS[1]}`;
            const availablePatternsForTS = CHORD_RHYTHM_PATTERNS[tsKey] || CHORD_RHYTHM_PATTERNS["default"];

            const ticksPerBeat = (4 / sectionTS[1]) * TICKS_PER_QUARTER_NOTE_REFERENCE;
            const ticksPerMeasure = sectionTS[0] * ticksPerBeat;

            let currentTickInSection = 0;
            let baseChordIndex = 0;

            // Stima la durata di un accordo base se non specificata (vecchia logica)
            const numBaseChords = sectionData.baseChords ? sectionData.baseChords.length : 0;
            const sectionTotalTicks = sectionData.measures * ticksPerMeasure;
            const estimatedTicksPerBaseChord = numBaseChords > 0 ? sectionTotalTicks / numBaseChords : sectionTotalTicks;


            while (baseChordIndex < numBaseChords && currentTickInSection < sectionTotalTicks) {
                const chordName = sectionData.baseChords[baseChordIndex];
                const chordDefinition = CHORD_LIB_GLOBAL[chordName] || helpers.getChordNotes(helpers.getChordRootAndType(chordName).root, helpers.getChordRootAndType(chordName).type);

                if (!chordDefinition || !chordDefinition.notes || chordDefinition.notes.length === 0) {
                    // console.warn(`generateChordRhythmEvents (legacy): Definizione accordo non trovata per ${chordName}`);
                    currentTickInSection += estimatedTicksPerBaseChord; // Avanza comunque
                    baseChordIndex++;
                    continue;
                }
                const midiNoteNumbers = chordDefinition.notes.map(noteName => {
                     let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
                     if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
                     let pitch = NOTE_NAMES_GLOBAL.indexOf(note);
                     if (pitch === -1) {
                         const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                         const mappedNote = sharpMap[noteName];
                         if(mappedNote) pitch = NOTE_NAMES_GLOBAL.indexOf(mappedNote);
                         else pitch = NOTE_NAMES_GLOBAL.indexOf(noteName);
                     }
                     return (pitch !== -1) ? pitch + 48 : null;
                 }).filter(n => n !== null);

                if (midiNoteNumbers.length === 0) {
                    currentTickInSection += estimatedTicksPerBaseChord;
                    baseChordIndex++;
                    continue;
                }

                let tickWithinCurrentChordSlot = 0;
                const currentChordSlotStartTickAbsolute = sectionStartTick + currentTickInSection;

                while (tickWithinCurrentChordSlot < estimatedTicksPerBaseChord && (currentTickInSection + tickWithinCurrentChordSlot) < sectionTotalTicks) {
                    const chosenRhythmPatternDef = helpers.getRandomElement(availablePatternsForTS);
                    if (!chosenRhythmPatternDef || !chosenRhythmPatternDef.pattern) break;

                    for (const rhythmEvent of chosenRhythmPatternDef.pattern) {
                        if (tickWithinCurrentChordSlot >= estimatedTicksPerBaseChord || (currentTickInSection + tickWithinCurrentChordSlot) >= sectionTotalTicks) break;

                        const eventDurationTicks = MIDI_DURATION_TO_TICKS[rhythmEvent.duration] || TICKS_PER_QUARTER_NOTE_REFERENCE;
                        let actualDurationTicks = eventDurationTicks;

                        if (tickWithinCurrentChordSlot + eventDurationTicks > estimatedTicksPerBaseChord) {
                            actualDurationTicks = estimatedTicksPerBaseChord - tickWithinCurrentChordSlot;
                        }
                        if ((currentTickInSection + tickWithinCurrentChordSlot + actualDurationTicks) > sectionTotalTicks) {
                            actualDurationTicks = sectionTotalTicks - (currentTickInSection + tickWithinCurrentChordSlot);
                        }

                        if (actualDurationTicks <= 0) continue;

                        rhythmicEvents.push({
                            pitch: midiNoteNumbers,
                            duration: `T${Math.round(actualDurationTicks)}`,
                            startTick: currentChordSlotStartTickAbsolute + tickWithinCurrentChordSlot,
                            velocity: 65
                        });
                        tickWithinCurrentChordSlot += actualDurationTicks;
                    }
                     if (availablePatternsForTS.length === 1 && chosenRhythmPatternDef.pattern.every(p => p.duration === "4n")) break; // Evita loop per default
                }
                currentTickInSection += Math.max(tickWithinCurrentChordSlot, estimatedTicksPerBaseChord); // Avanza per l'intero slot dell'accordo base
                baseChordIndex++;
            }
        });
    } else {
        console.warn("generateChordRhythmEvents: Dati canzone o sezioni mancanti, e nessun slotContext fornito.");
    }
    return rhythmicEvents;
}