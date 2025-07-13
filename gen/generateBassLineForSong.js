// File: gen/generateBassLineForSong.js
// CapricEngine - Bass Line Generator - v1.34
// Modificato per utilizzare section.mainChordSlots per durate accurate degli accordi,
// per migliorare il riempimento degli slot temporali, e con log di debug aggiunti.

require('../lib/config-music-data.js');

const MIN_BASS_MIDI_BASSLINE = 36; // E1
const MAX_BASS_MIDI_BASSLINE = 57; // A2

function convertBassNoteToMidi_v2(noteNameInput, NOTE_NAMES_SHARP, ALL_NOTES_FLAT, preferredOctave = 1) {
    if (typeof noteNameInput !== 'string' || noteNameInput.trim() === "" || !NOTE_NAMES_SHARP || !ALL_NOTES_FLAT) {
        // console.warn("BASS convertBassNoteToMidi_v2: Invalid input", noteNameInput);
        return null;
    }

    let noteNormalized = noteNameInput.charAt(0).toUpperCase() + noteNameInput.slice(1).toLowerCase();
    if (noteNormalized.length > 1 && noteNormalized.charAt(1) === 'b') {
        noteNormalized = noteNormalized.charAt(0).toUpperCase() + 'b';
    } else if (noteNormalized.length > 1 && noteNormalized.charAt(1) === '#') {
        noteNormalized = noteNormalized.charAt(0).toUpperCase() + '#';
    } else {
        noteNormalized = noteNormalized.charAt(0).toUpperCase();
    }

    let pitchIndex = NOTE_NAMES_SHARP.indexOf(noteNormalized);

    if (pitchIndex === -1) {
        const flatToSharpMap = { "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", "Ab": "G#", "Bb": "A#", "Cb": "B" };
        const sharpEquivalent = flatToSharpMap[noteNameInput.charAt(0).toUpperCase() + noteNameInput.slice(1).toLowerCase()];
        if (sharpEquivalent) {
            pitchIndex = NOTE_NAMES_SHARP.indexOf(sharpEquivalent);
        }
    }

    if (pitchIndex !== -1) {
        let midiVal = pitchIndex + (preferredOctave * 12) + 12;

        if (midiVal < MIN_BASS_MIDI_BASSLINE) {
            while (midiVal < MIN_BASS_MIDI_BASSLINE && (midiVal + 12 <= MAX_BASS_MIDI_BASSLINE + 7)) {
                midiVal += 12;
            }
        } else if (midiVal > MAX_BASS_MIDI_BASSLINE) {
            while (midiVal > MAX_BASS_MIDI_BASSLINE && (midiVal - 12 >= MIN_BASS_MIDI_BASSLINE - 7)) {
                midiVal -= 12;
            }
        }
        if (midiVal < MIN_BASS_MIDI_BASSLINE) midiVal = MIN_BASS_MIDI_BASSLINE;
        if (midiVal > MAX_BASS_MIDI_BASSLINE) midiVal = MAX_BASS_MIDI_BASSLINE;
        return midiVal;
    }
    // console.warn("BASS convertBassNoteToMidi_v2: Could not convert note", noteNameInput);
    return null;
}


function ensureMidiPitchInRange(pitch, preferredMidi, passedGetRandomElementFunc, scaleNotesMidiInRange) {
    if (pitch === null || typeof pitch === 'undefined') {
        if (scaleNotesMidiInRange && scaleNotesMidiInRange.length > 0) {
            // console.log("BASS ensureMidiPitchInRange: Pitch is null, selecting random from scaleNotesMidiInRange", scaleNotesMidiInRange);
            return passedGetRandomElementFunc(scaleNotesMidiInRange);
        }
        // console.warn("BASS ensureMidiPitchInRange: Pitch is null and no scale notes in range, returning MIN_BASS_MIDI_BASSLINE");
        return MIN_BASS_MIDI_BASSLINE;
    }

    let currentPitch = pitch;
    const referencePitch = preferredMidi !== null ? preferredMidi : ((MIN_BASS_MIDI_BASSLINE + MAX_BASS_MIDI_BASSLINE) / 2);

    if (currentPitch >= MIN_BASS_MIDI_BASSLINE && currentPitch <= MAX_BASS_MIDI_BASSLINE) {
        if (Math.abs(currentPitch - referencePitch) > 8) {
            if (currentPitch > referencePitch && (currentPitch - 12 >= MIN_BASS_MIDI_BASSLINE)) {
                currentPitch -= 12;
            } else if (currentPitch < referencePitch && (currentPitch + 12 <= MAX_BASS_MIDI_BASSLINE)) {
                currentPitch += 12;
            }
        }
        return currentPitch;
    }

    while (currentPitch < MIN_BASS_MIDI_BASSLINE) {
        currentPitch += 12;
    }
    while (currentPitch > MAX_BASS_MIDI_BASSLINE) {
        currentPitch -= 12;
    }

    if (currentPitch < MIN_BASS_MIDI_BASSLINE) return MIN_BASS_MIDI_BASSLINE;
    if (currentPitch > MAX_BASS_MIDI_BASSLINE) return MAX_BASS_MIDI_BASSLINE;

    return currentPitch;
}


function selectBassNote(
    chordToneNames,
    scaleNotesNames,
    lastMidiPitch,
    isStrongBeat,
    NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF,
    passedGetRandomElementFunc, passedGetChordRootAndTypeFunc,
    scaleNotesMidiInRangeFiltered
) {
    const rootNoteName = chordToneNames[0];
    let targetPitch = null;
    const preferredOctaveForBass = 1;

    if (isStrongBeat && Math.random() < 0.85) {
        targetPitch = convertBassNoteToMidi_v2(rootNoteName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, preferredOctaveForBass);
    } else {
        const rootMidi = convertBassNoteToMidi_v2(rootNoteName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, preferredOctaveForBass);
        const fifthMidi = chordToneNames.length > 2 ? convertBassNoteToMidi_v2(chordToneNames[2], NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, preferredOctaveForBass) : null;
        const thirdMidi = chordToneNames.length > 1 ? convertBassNoteToMidi_v2(chordToneNames[1], NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, preferredOctaveForBass) : null;

        let candidates = [];
        if (lastMidiPitch !== null) {
            const chordNoteMidis = [rootMidi, fifthMidi, thirdMidi].filter(p => p !== null && p >= MIN_BASS_MIDI_BASSLINE && p <= MAX_BASS_MIDI_BASSLINE);
            const stepCandidates = chordNoteMidis.filter(p => Math.abs(p - lastMidiPitch) <= 4 && p !== lastMidiPitch);
            if (stepCandidates.length > 0) {
                candidates.push(...stepCandidates);
            }
        }

        if (candidates.length === 0) {
            if (rootMidi && rootMidi >= MIN_BASS_MIDI_BASSLINE && rootMidi <= MAX_BASS_MIDI_BASSLINE) candidates.push(rootMidi);
            if (fifthMidi && fifthMidi >= MIN_BASS_MIDI_BASSLINE && fifthMidi <= MAX_BASS_MIDI_BASSLINE && Math.random() < 0.6) candidates.push(fifthMidi);
            if (thirdMidi && thirdMidi >= MIN_BASS_MIDI_BASSLINE && thirdMidi <= MAX_BASS_MIDI_BASSLINE && Math.random() < 0.4) candidates.push(thirdMidi);
        }

        if (candidates.length === 0 && scaleNotesMidiInRangeFiltered && scaleNotesMidiInRangeFiltered.length > 0) {
            if (lastMidiPitch !== null) {
                const scaleStepCandidates = scaleNotesMidiInRangeFiltered.filter(p => Math.abs(p - lastMidiPitch) <= 2 && p !== lastMidiPitch);
                if (scaleStepCandidates.length > 0) candidates.push(...scaleStepCandidates);
            }
            if (candidates.length === 0) {
                 const closeScaleNotes = scaleNotesMidiInRangeFiltered.filter(p=> rootMidi && Math.abs(p-rootMidi) <=5 );
                 if(closeScaleNotes.length > 0) candidates.push(passedGetRandomElementFunc(closeScaleNotes));
                 else candidates.push(passedGetRandomElementFunc(scaleNotesMidiInRangeFiltered));
            }
        }
        targetPitch = candidates.length > 0 ? passedGetRandomElementFunc(candidates.filter(p => p !== null)) : rootMidi;
    }

    let finalPitch = ensureMidiPitchInRange(targetPitch, lastMidiPitch, passedGetRandomElementFunc, scaleNotesMidiInRangeFiltered);

    // Aggiunto un fallback finale per garantire che non venga mai restituito null.
    if (finalPitch === null) {
        const rootMidi = convertBassNoteToMidi_v2(rootNoteName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, preferredOctaveForBass);
        finalPitch = ensureMidiPitchInRange(rootMidi, lastMidiPitch, passedGetRandomElementFunc, scaleNotesMidiInRangeFiltered);
        if (finalPitch === null) {
            // Se anche la radice fallisce, usiamo una nota di fallback sicura.
            finalPitch = MIN_BASS_MIDI_BASSLINE;
        }
    }


    return finalPitch;
}

/**
 * Genera eventi MIDI per un singolo slot di accordo, cercando di riempirlo.
 */
function applyRhythmicPatternToSlot(
    patternNameForSlot,
    currentSlotDurationTicks,
    ticksPerBeat,
    currentChordTones,
    currentScaleNotesNames, 
    initialLastPitch,
    noteNamesRef, allNotesFlatsRef,
    getRandomElementFunc, getChordRootAndTypeFunc,
    currentScaleNotesMidi, 
    currentTimeSignature
) {
    // Log all'inizio della funzione
    // console.log(`BASS APPLY_PATTERN: Slot Start. Pattern: ${patternNameForSlot}, Slot Duration: ${currentSlotDurationTicks}, Chord: ${currentChordTones.join(',')}, TicksPerBeat: ${ticksPerBeat}`);

    const TPQN_BASS_APPLY = typeof TICKS_PER_QUARTER_NOTE_REFERENCE !== 'undefined' ? TICKS_PER_QUARTER_NOTE_REFERENCE : 128;
    const slotEvents = [];
    let tickWithinSlot = 0;
    let lastEventPitchInSlot = initialLastPitch;
    const minSensibleNoteDuration = Math.max(1, TPQN_BASS_APPLY / 16); 

    const rootMidiForOctave = convertBassNoteToMidi_v2(currentChordTones[0], noteNamesRef, allNotesFlatsRef, 1);

    let iterationSafety = 0;
    const MAX_ITER_APPLY = Math.max(30, Math.ceil(currentSlotDurationTicks / minSensibleNoteDuration) * 3); // Aumentato il moltiplicatore


    while (tickWithinSlot < currentSlotDurationTicks && iterationSafety < MAX_ITER_APPLY) {
        iterationSafety++;
        let remainingTicks = currentSlotDurationTicks - tickWithinSlot;
        if (remainingTicks < minSensibleNoteDuration) {
            // console.log("BASS APPLY_PATTERN: Remaining ticks too short, breaking.", remainingTicks);
            break;
        }

        let ticksAddedThisSubPattern = 0;
        let tempEventsForSubPattern = [];
        let subPatternApplied = false;
        let noteDurationForSubPattern;
        let nextPitch = null;
        let velocityOffset = 0;
        let isStrongBeatEvent = (tickWithinSlot % ticksPerBeat < TPQN_BASS_APPLY / 16);

        let chosenSubPatternLogic = patternNameForSlot;

        switch (chosenSubPatternLogic) {
            case "onBeats":
                noteDurationForSubPattern = ticksPerBeat;
                if (remainingTicks >= noteDurationForSubPattern) {
                    nextPitch = selectBassNote(currentChordTones, currentScaleNotesNames, lastEventPitchInSlot, true, noteNamesRef, allNotesFlatsRef, getRandomElementFunc, getChordRootAndTypeFunc, currentScaleNotesMidi);
                    velocityOffset = 5;
                }
                break;

            case "eighthNotesRoot":
                noteDurationForSubPattern = ticksPerBeat / 2;
                if (remainingTicks >= noteDurationForSubPattern) {
                    nextPitch = rootMidiForOctave ? ensureMidiPitchInRange(rootMidiForOctave, lastEventPitchInSlot, getRandomElementFunc, currentScaleNotesMidi) : selectBassNote(currentChordTones, currentScaleNotesNames, lastEventPitchInSlot, isStrongBeatEvent, noteNamesRef, allNotesFlatsRef, getRandomElementFunc, getChordRootAndTypeFunc, currentScaleNotesMidi);
                    velocityOffset = isStrongBeatEvent ? 3 : -2;
                }
                break;

            case "pedal":
                noteDurationForSubPattern = ticksPerBeat;
                 if (remainingTicks >= noteDurationForSubPattern) {
                    nextPitch = rootMidiForOctave ? ensureMidiPitchInRange(rootMidiForOctave, lastEventPitchInSlot, getRandomElementFunc, currentScaleNotesMidi) : MIN_BASS_MIDI_BASSLINE;
                    velocityOffset = (Math.floor(tickWithinSlot / ticksPerBeat) % 2 === 0) ? 2 : 0;
                }
                break;
            
            case "walkingUp":
            case "walkingDown":
                noteDurationForSubPattern = ticksPerBeat;
                if (remainingTicks >= noteDurationForSubPattern) {
                    const scaleMidiSorted = [...currentScaleNotesMidi].sort((a,b)=>a-b);
                    if (scaleMidiSorted.length > 0) {
                        let currentIndexInScale = scaleMidiSorted.indexOf(lastEventPitchInSlot);
                        if(currentIndexInScale === -1) {
                            let minDist = Infinity;
                            scaleMidiSorted.forEach((p,ix) => { if(Math.abs(p - lastEventPitchInSlot) < minDist) {minDist = Math.abs(p - lastEventPitchInSlot); currentIndexInScale = ix;}});
                            if (currentIndexInScale === -1) currentIndexInScale = Math.floor(scaleMidiSorted.length / 2);
                        }
                        const direction = (chosenSubPatternLogic === "walkingUp") ? 1 : -1;
                        let nextIdx = (currentIndexInScale + direction + scaleMidiSorted.length) % scaleMidiSorted.length;
                        nextPitch = scaleMidiSorted[nextIdx];

                        if (direction === 1 && nextPitch < lastEventPitchInSlot && nextPitch + 12 <= MAX_BASS_MIDI_BASSLINE) nextPitch +=12;
                        if (direction === -1 && nextPitch > lastEventPitchInSlot && nextPitch - 12 >= MIN_BASS_MIDI_BASSLINE) nextPitch -=12;
                        nextPitch = ensureMidiPitchInRange(nextPitch, lastEventPitchInSlot, getRandomElementFunc, currentScaleNotesMidi);
                        if (nextPitch === lastEventPitchInSlot && scaleMidiSorted.length > 1) { // Evita di rimanere sulla stessa nota se possibile
                            nextIdx = (nextIdx + direction + scaleMidiSorted.length) % scaleMidiSorted.length;
                            nextPitch = ensureMidiPitchInRange(scaleMidiSorted[nextIdx], lastEventPitchInSlot, getRandomElementFunc, currentScaleNotesMidi);
                        }
                        velocityOffset = 0;
                    } else {
                        nextPitch = selectBassNote(currentChordTones, currentScaleNotesNames, lastEventPitchInSlot, isStrongBeatEvent, noteNamesRef, allNotesFlatsRef, getRandomElementFunc, getChordRootAndTypeFunc, currentScaleNotesMidi);
                    }
                }
                break;
            
            case "rootFifthOctaveSimple":
                // Questo pattern implica una sequenza, quindi lo gestiamo diversamente dal loop principale
                // per evitare di generare solo un frammento. Se scelto, prova a fare tutta la sequenza.
                const rfoDurationsSeq = [ticksPerBeat, ticksPerBeat, ticksPerBeat];
                let rfoTicksUsedSeq = 0;
                let tempRFOEvents = [];
                let lastRFOpitch = lastEventPitchInSlot;

                if (remainingTicks >= rfoDurationsSeq[0]) {
                    const rNote = selectBassNote(currentChordTones, currentScaleNotesNames, lastRFOpitch, true, noteNamesRef, allNotesFlatsRef, getRandomElementFunc, getChordRootAndTypeFunc, currentScaleNotesMidi);
                    if (rNote !== null) {
                        tempRFOEvents.push({ pitch: [rNote], duration: `T${Math.round(rfoDurationsSeq[0])}`, velocityOffset: 5, startTickOffsetInSlot: tickWithinSlot + rfoTicksUsedSeq });
                        lastRFOpitch = rNote; rfoTicksUsedSeq += rfoDurationsSeq[0];
                    }
                }
                if (currentChordTones.length > 2 && remainingTicks - rfoTicksUsedSeq >= rfoDurationsSeq[1]) {
                    const fNoteName = currentChordTones[2];
                    let fNoteMidi = convertBassNoteToMidi_v2(fNoteName, noteNamesRef, allNotesFlatsRef, 1);
                    fNoteMidi = ensureMidiPitchInRange(fNoteMidi, lastRFOpitch, getRandomElementFunc, currentScaleNotesMidi);
                    if (fNoteMidi !== null) {
                        tempRFOEvents.push({ pitch: [fNoteMidi], duration: `T${Math.round(rfoDurationsSeq[1])}`, velocityOffset: 0, startTickOffsetInSlot: tickWithinSlot + rfoTicksUsedSeq });
                        lastRFOpitch = fNoteMidi; rfoTicksUsedSeq += rfoDurationsSeq[1];
                    }
                }
                if (rootMidiForOctave && remainingTicks - rfoTicksUsedSeq >= rfoDurationsSeq[2]) {
                    let oNoteMidi = rootMidiForOctave + 12;
                    oNoteMidi = ensureMidiPitchInRange(oNoteMidi, lastRFOpitch, getRandomElementFunc, currentScaleNotesMidi);
                    if (oNoteMidi !== null) {
                        tempRFOEvents.push({ pitch: [oNoteMidi], duration: `T${Math.round(rfoDurationsSeq[2])}`, velocityOffset: -2, startTickOffsetInSlot: tickWithinSlot + rfoTicksUsedSeq });
                        lastRFOpitch = oNoteMidi; rfoTicksUsedSeq += rfoDurationsSeq[2];
                    }
                }
                if (rfoTicksUsedSeq > 0) {
                    slotEvents.push(...tempRFOEvents); // Aggiunge direttamente a slotEvents
                    lastEventPitchInSlot = lastRFOpitch;
                    tickWithinSlot += rfoTicksUsedSeq;
                    subPatternApplied = true; // Segna che il pattern complesso è stato applicato
                }
                // Se il pattern complesso non è stato applicato o non ha riempito, il while continuerà
                // e potrebbe cadere nel default. Non c'è `ticksAddedThisSubPattern` qui perché gli eventi sono già aggiunti.
                continue; // Passa alla prossima iterazione del while


            default: // "defaultLongNote" o pattern non gestito specificamente per il loop
                noteDurationForSubPattern = remainingTicks;
                nextPitch = selectBassNote(currentChordTones, currentScaleNotesNames, lastEventPitchInSlot, true, noteNamesRef, allNotesFlatsRef, getRandomElementFunc, getChordRootAndTypeFunc, currentScaleNotesMidi);
                velocityOffset = 1; // Velocity leggermente diversa per il fill di default
                break;
        }

        if (nextPitch !== null && noteDurationForSubPattern >= minSensibleNoteDuration) {
            // Tronca la nota se supera lo spazio rimanente nello slot (già fatto implicitamente da `remainingTicks` per il default)
            const finalDuration = Math.min(noteDurationForSubPattern, remainingTicks);

            slotEvents.push({
                pitch: [nextPitch],
                duration: `T${Math.round(finalDuration)}`,
                startTickOffsetInSlot: tickWithinSlot,
                velocityOffset: velocityOffset
            });
            lastEventPitchInSlot = nextPitch;
            tickWithinSlot += finalDuration;
            subPatternApplied = true;
        } else if (noteDurationForSubPattern > 0 && nextPitch === null) { // Pausa implicita calcolata
            tickWithinSlot += Math.min(noteDurationForSubPattern, remainingTicks);
        } else {

            // Fallback: se non è stata generata una nota, suona la fondamentale per il resto dello slot
            // o per un beat, per evitare il silenzio.
            const fallbackDuration = Math.max(minSensibleNoteDuration, Math.min(remainingTicks, ticksPerBeat));
            const fallbackPitch = ensureMidiPitchInRange(
                rootMidiForOctave,
                lastEventPitchInSlot,
                getRandomElementFunc,
                currentScaleNotesMidi
            );

            if (fallbackPitch !== null) {
                slotEvents.push({
                    pitch: [fallbackPitch],
                    duration: `T${Math.round(fallbackDuration)}`,
                    startTickOffsetInSlot: tickWithinSlot,
                    velocityOffset: -5 // Leggermente più piano per indicare che è un riempimento
                });
                lastEventPitchInSlot = fallbackPitch;
                tickWithinSlot += fallbackDuration;
            } else {
                // Se anche il fallback fallisce (improbabile), avanziamo per evitare un loop infinito.
                tickWithinSlot += fallbackDuration;
            }

        }
    }
    // if(iterationSafety >= MAX_ITER_APPLY) console.warn("BASS APPLY_PATTERN: Max iterations reached for slot.", patternNameForSlot, currentSlotDurationTicks);
    // console.log(`BASS APPLY_PATTERN: Slot End. Pattern: ${patternNameForSlot}, Events generated: ${slotEvents.length}, Total ticks filled: ${tickWithinSlot}`);
    return { events: slotEvents, lastPitch: lastEventPitchInSlot };
}


function generateBassLineForSong(
    songMidiData,
    mainScaleNotesNames,
    rootNoteOfScale,
    CHORD_LIB_REF,
    scales_REF,
    NOTE_NAMES_CONST_REF,
    ALL_NOTES_WITH_FLATS_REF,
    passedGetChordNotesFunc,
    passedGetNoteNameFunc,
    passedGetRandomElementFunc,
    passedGetChordRootAndTypeFunc,
    options = {}
) {
    // Log all'inizio della funzione generateBassLineForSong
    // console.log("BASS GEN: Inizio generazione basso. songMidiData sections:", songMidiData?.sections?.length, "mainScaleNotesNames:", mainScaleNotesNames);

    if (!songMidiData || !songMidiData.sections || !mainScaleNotesNames || mainScaleNotesNames.length === 0) {
        console.error("generateBassLineForSong: Dati canzone o scala mancanti.");
        return null;
    }
    const helpers = { passedGetChordNotesFunc, passedGetNoteNameFunc, passedGetRandomElementFunc, passedGetChordRootAndTypeFunc };
    for (const key in helpers) {
        if (typeof helpers[key] !== 'function') {
            console.error(`generateBassLineForSong ERRORE: ${key} NON è una funzione.`);
            return null;
        }
    }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') {
        console.error("generateBassLineForSong: TICKS_PER_QUARTER_NOTE_REFERENCE non definito globalmente!");
        return null;
    }
    const TPQN_BASS_MAIN = TICKS_PER_QUARTER_NOTE_REFERENCE;

    const bassEvents = [];
    const scaleNotesMidiInRange = mainScaleNotesNames.map(noteName => {
        let pitch = convertBassNoteToMidi_v2(noteName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
        if (pitch && pitch >= MIN_BASS_MIDI_BASSLINE && pitch <= MAX_BASS_MIDI_BASSLINE) return pitch;
        pitch = convertBassNoteToMidi_v2(noteName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 2);
        if (pitch && pitch >= MIN_BASS_MIDI_BASSLINE && pitch <= MAX_BASS_MIDI_BASSLINE) return pitch;
        pitch = convertBassNoteToMidi_v2(noteName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 0);
        if (pitch && pitch >= MIN_BASS_MIDI_BASSLINE && pitch <= MAX_BASS_MIDI_BASSLINE) return pitch;
        return null;
    }).filter(p => p !== null).sort((a,b) => a-b);

    if (scaleNotesMidiInRange.length === 0) {
        // console.warn("BASS GEN: scaleNotesMidiInRange è vuoto dopo il mapping iniziale. Tento fallback con rootNoteOfScale.");
        let rootFallback = convertBassNoteToMidi_v2(rootNoteOfScale, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
        if (rootFallback && rootFallback >= MIN_BASS_MIDI_BASSLINE && rootFallback <= MAX_BASS_MIDI_BASSLINE) {
            scaleNotesMidiInRange.push(rootFallback);
        } else {
            // console.warn("BASS GEN: rootNoteOfScale non è nel range. Uso MIN_BASS_MIDI_BASSLINE come estremo fallback per la scala.");
            scaleNotesMidiInRange.push(MIN_BASS_MIDI_BASSLINE);
        }
    }

    let lastGeneratedMidiPitch = passedGetRandomElementFunc(scaleNotesMidiInRange) || MIN_BASS_MIDI_BASSLINE;
    const availableRhythmicFeels = ["onBeats", "eighthNotesRoot", "pedal", "defaultLongNote", "syncopatedRootFifth", "walkingUp", "walkingDown", "rootFifthOctaveSimple"];


    songMidiData.sections.forEach(section => {
        if (!section || !section.mainChordSlots || section.mainChordSlots.length === 0 || !section.timeSignature || typeof section.startTick === 'undefined') {
            return;
        }

        const sectionTimeSignature = section.timeSignature;
        const sectionStartTickAbsolute = section.startTick;
        const currentTicksPerBeat = (4 / sectionTimeSignature[1]) * TPQN_BASS_MAIN;

        if (options.globalRandomActivationProbability && Math.random() > options.globalRandomActivationProbability) {
             return;
        }

        let currentRhythmicFeelForSection = passedGetRandomElementFunc(availableRhythmicFeels.filter(f => f !== "defaultLongNote")); // Scegli un feel per la sezione


        section.mainChordSlots.forEach(chordSlot => {
            const chordName = chordSlot.chordName;
            const slotStartTickInSectionAbsolute = sectionStartTickAbsolute + chordSlot.effectiveStartTickInSection;
            const slotDurationTicks = chordSlot.effectiveDurationTicks;

            // Log per ogni chordSlot
            // console.log(`BASS GEN: Processing chordSlot for ${chordName} in section ${section.name}. Duration: ${slotDurationTicks} ticks. Slot Start Abs: ${slotStartTickInSectionAbsolute}`);


            if (slotDurationTicks < (TPQN_BASS_MAIN / 8)) { // Salta slot troppo brevi
                // console.log(`BASS GEN: Slot per ${chordName} troppo corto (${slotDurationTicks}), skipping.`);
                return;
            }

            const { root: chordRootNameStr, type: chordTypeSuffix } = passedGetChordRootAndTypeFunc(chordName);
            if (!chordRootNameStr) {
                // console.warn(`BASS GEN: Impossibile parsare la radice per ${chordName}, skipping slot.`);
                return;
            }
            const chordTonesData = passedGetChordNotesFunc(chordRootNameStr, chordTypeSuffix, CHORD_LIB_REF);
            const chordToneNamesCurrent = chordTonesData.notes && chordTonesData.notes.length > 0 ? chordTonesData.notes : [chordRootNameStr];

            // Scegli un pattern ritmico per questo slot
            let patternForThisChordSlot = currentRhythmicFeelForSection;
            if (Math.random() < 0.3) { // 30% di possibilità di cambiare il feel per questo specifico slot
                 patternForThisChordSlot = passedGetRandomElementFunc(availableRhythmicFeels.filter(f => f !== "defaultLongNote"));
            }
            
            // Semplifica il pattern se lo slot è corto
            if (slotDurationTicks < currentTicksPerBeat * 2 && (patternForThisChordSlot === "walkingUp" || patternForThisChordSlot === "walkingDown" || patternForThisChordSlot === "rootFifthOctaveSimple" || patternForThisChordSlot === "syncopatedRootFifth" )) {
                patternForThisChordSlot = passedGetRandomElementFunc(["onBeats", "eighthNotesRoot"]);
            }
             if (slotDurationTicks < currentTicksPerBeat && patternForThisChordSlot !== "pedal" ) { // Se meno di un beat
                patternForThisChordSlot = "defaultLongNote";
            }


            const { events: newEventsFromPattern, lastPitch: pitchAfterPattern } = applyRhythmicPatternToSlot(
                patternForThisChordSlot === "defaultLongNote" ? "default" : patternForThisChordSlot,
                slotDurationTicks,
                currentTicksPerBeat,
                chordToneNamesCurrent,
                mainScaleNotesNames,
                lastGeneratedMidiPitch,
                NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF,
                passedGetRandomElementFunc, passedGetChordRootAndTypeFunc,
                scaleNotesMidiInRange,
                sectionTimeSignature
            );

            // console.log(`BASS GEN: Pattern "${patternForThisChordSlot}" per ${chordName} ha generato ${newEventsFromPattern.length} eventi.`);

            newEventsFromPattern.forEach(partialEvent => {
                const eventAbsoluteStartTick = slotStartTickInSectionAbsolute + partialEvent.startTickOffsetInSlot;
                const durationNum = parseInt(partialEvent.duration.substring(1));

                bassEvents.push({
                    pitch: partialEvent.pitch,
                    duration: `T${durationNum}`,
                    startTick: eventAbsoluteStartTick,
                    velocity: Math.max(45, Math.min(110, (passedGetRandomElementFunc([75, 80, 85, 90]) + (partialEvent.velocityOffset || 0) + (Math.floor(Math.random() * 11) - 5))))
                });
            });

            if (pitchAfterPattern !== null) {
                lastGeneratedMidiPitch = pitchAfterPattern;
            }
        });
    });

    // Log prima del filtro finale
    // console.log("BASS GEN: Fine generazione. Eventi totali PRIMA del filtro finale:", bassEvents.length);
    if (bassEvents.length === 0 && songMidiData.sections.some(s => s.mainChordSlots && s.mainChordSlots.length > 0)) { // Solo se c'erano slot da processare
        console.warn("BASS GEN: NESSUN evento generato prima del filtro finale. Controllare log precedenti per slot specifici.");
    }


    if (bassEvents.length > 1) {
        bassEvents.sort((a,b) => a.startTick - b.startTick);
        for (let i = 0; i < bassEvents.length - 1; i++) {
            const currentEvent = bassEvents[i];
            const nextEvent = bassEvents[i+1];
            if (!currentEvent.duration || typeof nextEvent.startTick === 'undefined' || typeof currentEvent.startTick === 'undefined') continue;

            const currentEventEndTick = currentEvent.startTick + parseInt(currentEvent.duration.substring(1));

            if (currentEventEndTick > nextEvent.startTick) {
                const newDuration = nextEvent.startTick - currentEvent.startTick;
                if (newDuration >= TPQN_BASS_MAIN / 8) {
                    currentEvent.duration = `T${newDuration}`;
                } else {
                    bassEvents.splice(i, 1);
                    i--;
                }
            }
        }
    }
    const finalBassEvents = bassEvents.filter(event => event && event.duration && parseInt(event.duration.substring(1)) > 0);
    // console.log("BASS GEN: Eventi finali DOPO il filtro:", finalBassEvents.length);
    return finalBassEvents;
}
