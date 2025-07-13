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
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 1 },
            { duration: TPQN, rest: false, octave: 0 },
        ],
        rock: [
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 1 },
            { duration: TPQN / 2, rest: false, octave: 0 },
            { duration: TPQN / 2, rest: false, octave: 0 },
        ],
        walking: [
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
            { duration: TPQN, rest: false, octave: 0 },
        ],
        simple: [
            { duration: TPQN * 2, rest: false, octave: 0 },
            { duration: TPQN * 2, rest: true, octave: 0 },
        ]
    };

    songMidiData.sections.forEach(section => {
        const sectionTimeSignature = section.timeSignature;
        const ticksPerBeat = (4 / sectionTimeSignature[1]) * TPQN;
        const patternName = section.name.toLowerCase().includes("walk") ? "walking"
                            : section.name.toLowerCase().includes("rock") ? "rock"
                            : section.name.toLowerCase().includes("pop") ? "pop"
                            : "simple";
        const pattern = rhythmicPatterns[patternName];

        section.mainChordSlots.forEach(slot => {
            const chordName = slot.chordName;
            const { root: chordRootName } = passedGetChordRootAndTypeFunc(chordName);
            const chordData = passedGetChordNotesFunc(chordRootName, '', CHORD_LIB_REF);
            const [tonic, third, fifth] = chordData.notes;

            const rootMidi = convertBassNoteToMidi_v2(tonic, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
            const thirdMidi = convertBassNoteToMidi_v2(third, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
            const fifthMidi = convertBassNoteToMidi_v2(fifth, NOTE_NAMES_CONST_REF, ALL_NOTES_WITH_FLATS_REF, 1);
            const pitchChoices = [rootMidi, fifthMidi, thirdMidi].filter(p => p !== null);

            let tick = 0;
            let patternIndex = 0;

            while (tick < slot.effectiveDurationTicks) {
                const patternEvent = pattern[patternIndex % pattern.length];
                const duration = Math.min(patternEvent.duration, slot.effectiveDurationTicks - tick);

                if (!patternEvent.rest) {
                    let pitch = passedGetRandomElementFunc(pitchChoices);
                    if (patternEvent.octave !== 0) pitch += patternEvent.octave * 12;

                    const finalPitch = ensureMidiPitchInRange(
                        pitch,
                        lastMidiPitch,
                        passedGetRandomElementFunc,
                        pitchChoices
                    );

                    bassEvents.push(createNote(
                        finalPitch,
                        duration,
                        slot.effectiveStartTickInSection + tick,
                        75 + Math.floor(Math.random() * 15)
                    ));
                    lastMidiPitch = finalPitch;
                }

                tick += duration;
                patternIndex++;
            }
        });
    });

    return bassEvents;
}
