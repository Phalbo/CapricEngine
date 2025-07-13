// File: gen/generateBassLineForSong_v2.js

// CapricEngine - New Bass Line Generator - v1.0
if (typeof require !== 'undefined') {
    require('../lib/config-music-data.js');
}


const MIN_BASS_MIDI = 36; // E1
const MAX_BASS_MIDI = 60; // C3

function convertBassNoteToMidi_v2(noteNameInput, NOTE_NAMES_SHARP, ALL_NOTES_FLAT, preferredOctave = 1) {
    if (typeof noteNameInput !== 'string' || noteNameInput.trim() === "" || !NOTE_NAMES_SHARP || !ALL_NOTES_FLAT) {
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
        const sharpEquivalent = flatToSharpMap[noteNormalized];
        if (sharpEquivalent) {
            pitchIndex = NOTE_NAMES_SHARP.indexOf(sharpEquivalent);
        }
    }

    if (pitchIndex !== -1) {
        let midiVal = pitchIndex + (preferredOctave * 12) + 12;

        if (midiVal < MIN_BASS_MIDI) {
            while (midiVal < MIN_BASS_MIDI && (midiVal + 12 <= MAX_BASS_MIDI + 7)) {
                midiVal += 12;
            }
        } else if (midiVal > MAX_BASS_MIDI) {
            while (midiVal > MAX_BASS_MIDI && (midiVal - 12 >= MIN_BASS_MIDI - 7)) {
                midiVal -= 12;
            }
        }
        return Math.min(Math.max(midiVal, MIN_BASS_MIDI), MAX_BASS_MIDI);
    }
    return null;
}

function ensureMidiPitchInRange(pitch, preferredMidi, passedGetRandomElementFunc, scaleNotesMidiInRange) {
    if (pitch == null) {
        return (scaleNotesMidiInRange?.length > 0)
            ? passedGetRandomElementFunc(scaleNotesMidiInRange)
            : MIN_BASS_MIDI;
    }

    let currentPitch = pitch;
    const referencePitch = preferredMidi ?? ((MIN_BASS_MIDI + MAX_BASS_MIDI) / 2);

    if (currentPitch >= MIN_BASS_MIDI && currentPitch <= MAX_BASS_MIDI) {
        if (Math.abs(currentPitch - referencePitch) > 8) {
            if (currentPitch > referencePitch && currentPitch - 12 >= MIN_BASS_MIDI) {
                currentPitch -= 12;
            } else if (currentPitch < referencePitch && currentPitch + 12 <= MAX_BASS_MIDI) {
                currentPitch += 12;
            }
        }
        return currentPitch;
    }

    while (currentPitch < MIN_BASS_MIDI) currentPitch += 12;
    while (currentPitch > MAX_BASS_MIDI) currentPitch -= 12;

    return Math.min(Math.max(currentPitch, MIN_BASS_MIDI), MAX_BASS_MIDI);
}

function createNote(pitch, duration, startTick, velocity) {
    return {
        pitch: [pitch],
        duration: `T${duration}`,
        startTick,
        velocity,
    };
}

function generateBassLineForSong_v2(
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
    const TPQN = typeof TICKS_PER_QUARTER_NOTE_REFERENCE !== 'undefined' ? TICKS_PER_QUARTER_NOTE_REFERENCE : 128;
    const bassEvents = [];
    let lastMidiPitch = null;

    const rhythmicPatterns = {
        pop: [
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: true, octave: 0 },
        ],
        rock: [
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 1 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 1 },
        ],
        walking: [
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
        ],
        popRock: [
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 1 },
            { duration: TPQN, rest: false, octave: 0 },
        ],
    };

    songMidiData.sections.forEach(section => {
        const ticksPerBeat = (4 / section.timeSignature[1]) * TPQN;

        section.mainChordSlots.forEach(slot => {
            const chordName = slot.chordName;
            const { root: chordRootName } = passedGetChordRootAndTypeFunc(chordName);
            const chordTonesData = passedGetChordNotesFunc(chordRootName, '', CHORD_LIB_REF);
            const chordToneNames = chordTonesData.notes;

            const patternName = passedGetRandomElementFunc(Object.keys(rhythmicPatterns));
            const pattern = rhythmicPatterns[patternName];

            let tick = 0;
            let patternIndex = 0;

            while (tick < slot.effectiveDurationTicks) {
                const patternEvent = pattern[patternIndex % pattern.length];
                const duration = Math.min(patternEvent.duration, slot.effectiveDurationTicks - tick);

                if (!patternEvent.rest) {
                    let pitch = null;

                    if (patternName === 'walking') {
                        const scaleNotesMidi = mainScaleNotesNames.map(note =>
                            convertBassNoteToMidi_v2(note, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1)
                        );
                        const scaleNotesMidiInRange = scaleNotesMidi.filter(p => p >= MIN_BASS_MIDI && p <= MAX_BASS_MIDI);
                        const closeNotes = lastMidiPitch
                            ? scaleNotesMidiInRange.filter(p => Math.abs(p - lastMidiPitch) <= 4 && p !== lastMidiPitch)
                            : [];
                        pitch = closeNotes.length > 0
                            ? passedGetRandomElementFunc(closeNotes)
                            : passedGetRandomElementFunc(scaleNotesMidiInRange);
                    } else {
                        const rootMidi = convertBassNoteToMidi_v2(chordRootName, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
                        const fifthMidi = convertBassNoteToMidi_v2(chordToneNames[2], NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
                        pitch = passedGetRandomElementFunc([rootMidi, fifthMidi].filter(Boolean));
                    }

                    if (pitch) {
                        pitch += patternEvent.octave * 12;
                        const finalPitch = ensureMidiPitchInRange(pitch, lastMidiPitch, passedGetRandomElementFunc, []);
                        const velocity = 80 + Math.floor(Math.random() * 20);
                        bassEvents.push(createNote(finalPitch, duration, slot.effectiveStartTickInSection + tick, velocity));
                        lastMidiPitch = finalPitch;
                    }
                }

                tick += duration;
                patternIndex++;
            }
        });
    });

    return bassEvents;
}
