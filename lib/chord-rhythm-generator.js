// File: lib/chord-rhythm-generator.js - v2.0
// Genera un semplice arpeggio per un dato slot di accordo.

/**
 * Genera una serie di eventi MIDI che formano un semplice arpeggio.
 * @param {object} songMidiData - Dati MIDI globali (non usati direttamente, ma per coerenza API).
 * @param {object} CHORD_LIB_GLOBAL - La libreria degli accordi.
 * @param {string[]} NOTE_NAMES_GLOBAL - Array dei nomi delle note.
 * @param {object} helpers - Oggetto contenente funzioni di utilità.
 * @param {object} slotContext - Il contesto dello slot di accordo.
 *   Formato: { chordName, startTickAbsolute, durationTicks, timeSignature }
 * @returns {Array} Array di eventi MIDI (formato NoteEvent di MidiWriter.js).
 */
function generateChordRhythmEvents(songMidiData, CHORD_LIB_GLOBAL, NOTE_NAMES_GLOBAL, helpers, slotContext) {
    const rhythmicEvents = [];
    if (!slotContext || !slotContext.chordName || !helpers || typeof helpers.getChordRootAndType !== 'function') {
        return rhythmicEvents;
    }

    const { chordName, startTickAbsolute, durationTicks, timeSignature } = slotContext;

    // Ottieni le note dell'accordo
    const { root, type } = helpers.getChordRootAndType(chordName);
    const chordDefinition = CHORD_LIB_GLOBAL[chordName] || helpers.getChordNotes(root, type);

    if (!chordDefinition || !chordDefinition.notes || chordDefinition.notes.length < 3) {
        // Se l'accordo non è valido o ha meno di 3 note, non possiamo creare un arpeggio
        return rhythmicEvents;
    }

    // Mappa i nomi delle note ai numeri MIDI
    const midiNoteNumbers = chordDefinition.notes.map(noteName => {
        let pitch = NOTE_NAMES_GLOBAL.indexOf(noteName);
        if (pitch === -1) {
            const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
            const mappedNote = sharpMap[noteName];
            if(mappedNote) pitch = NOTE_NAMES_GLOBAL.indexOf(mappedNote);
        }
        return (pitch !== -1) ? pitch + 48 : null; // Ottava C3
    }).filter(n => n !== null);

    if (midiNoteNumbers.length < 3) return rhythmicEvents;

    const [tonic, third, fifth] = midiNoteNumbers;
    const arpeggioPattern = [tonic, third, fifth, third];

    // Durata di un ottavo
    const eighthNoteDuration = TICKS_PER_QUARTER_NOTE_REFERENCE / 2;

    let currentTickInSlot = 0;
    let patternIndex = 0;

    while (currentTickInSlot < durationTicks) {
        const noteToPlay = arpeggioPattern[patternIndex % arpeggioPattern.length];

        let actualDurationTicks = eighthNoteDuration;
        if (currentTickInSlot + actualDurationTicks > durationTicks) {
            actualDurationTicks = durationTicks - currentTickInSlot;
        }

        if (actualDurationTicks > 0) {
            rhythmicEvents.push({
                pitch: [noteToPlay],
                duration: `T${Math.round(actualDurationTicks)}`,
                startTick: startTickAbsolute + currentTickInSlot,
                velocity: 75
            });
        }

        currentTickInSlot += eighthNoteDuration;
        patternIndex++;
    }

    return rhythmicEvents;
}
