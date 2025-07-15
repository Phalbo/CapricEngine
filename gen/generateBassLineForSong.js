// gen/generateBassLineForSong.js

const BASS_PARAMS = {
    // Range MIDI standard per un basso a 4 corde (E1 a G4)
    PITCH_RANGE: { min: 28, max: 55 },

    // Probabilità di eseguire un arpeggio invece del pattern standard
    ARPEGGIO_CHANCE: 0.15,

    // Probabilità di usare un salto d'ottava quando si suona la tonica
    OCTAVE_JUMP_CHANCE: 0.35,

    // Probabilità di inserire una nota di passaggio cromatica (deve essere molto bassa)
    CHROMATIC_PASSING_NOTE_CHANCE: 0.05,

    // Gerarchia di probabilità per la selezione delle note armoniche (quando non si suona la tonica)
    NOTE_SELECTION_PROBABILITY: [
        { type: 'FIFTH', weight: 45 },      // La quinta è la nota più stabile dopo la tonica
        { type: 'THIRD', weight: 30 },      // La terza definisce il colore dell'accordo
        { type: 'DIATONIC', weight: 25 },   // Una nota di passaggio della scala
    ]
};

// Libreria estensibile di pattern ritmici (espressi in beat)
const BASS_RHYTHMIC_PATTERNS = {
    '4/4': [
        { name: "Standard", pattern: [1, 1, 1, 1] },
        { name: "DottedGroove", pattern: [1.5, 0.5, 2] },
        { name: "HalfNotes", pattern: [2, 2] }
    ],
    '3/4': [
        { name: "Waltz", pattern: [1, 1, 1] },
        { name: "OnTwo", pattern: [2, 1] }
    ]
};

function generateBassPhraseForSlot(context, lastEvent, helpers) {
    const { chordName, durationTicks, timeSignature, songData, sectionIndex, slotIndex } = context;
    const { getChordRootAndType, getChordNotes, getRandomElement } = helpers;
    const phraseEvents = [];
    const ticksPerBeat = (4 / timeSignature[1]) * TICKS_PER_QUARTER_NOTE_REFERENCE;

    if (Math.random() < BASS_PARAMS.ARPEGGIO_CHANCE) {
        const { root, type } = getChordRootAndType(chordName);
        const chordNotes = getChordNotes(root, type);
        const arpeggioPitches = [
            NOTE_NAMES.indexOf(chordNotes.notes[0]),
            NOTE_NAMES.indexOf(chordNotes.notes[2]),
            NOTE_NAMES.indexOf(chordNotes.notes[1]),
            NOTE_NAMES.indexOf(chordNotes.notes[0]) + 12
        ];

        let currentTick = 0;
        arpeggioPitches.forEach(pitch => {
            if (currentTick < durationTicks) {
                phraseEvents.push({
                    pitch: [pitch],
                    duration: `T${durationTicks / arpeggioPitches.length}`,
                    startTick: context.startTick + currentTick,
                    velocity: 80
                });
                currentTick += durationTicks / arpeggioPitches.length;
            }
        });

    } else {
        const tsKey = `${timeSignature[0]}/${timeSignature[1]}`;
        const rhythmPattern = BASS_RHYTHMIC_PATTERNS[tsKey] ? getRandomElement(BASS_RHYTHMIC_PATTERNS[tsKey]).pattern : [1, 1, 1, 1];

        let currentTick = 0;
        rhythmPattern.forEach((durationInBeats, index) => {
            if (currentTick < durationTicks) {
                const durationInTicks = durationInBeats * ticksPerBeat;
                const pitch = selectBassPitch({
                    chord: { chordName },
                    isFirstBeat: index === 0,
                    lastNote: phraseEvents.length > 0 ? phraseEvents[phraseEvents.length - 1] : lastEvent,
                    songData,
                    sectionIndex,
                    slotIndex
                }, helpers);

                phraseEvents.push({
                    pitch: [pitch],
                    duration: `T${durationInTicks}`,
                    startTick: context.startTick + currentTick,
                    velocity: 80
                });
                currentTick += durationInTicks;
            }
        });
    }

    return phraseEvents;
}

function generateBassLineForSong(songData, helpers) {
    const bassLine = [];
    let lastEvent = null;

    songData.sections.forEach((section, sectionIndex) => {
        section.mainChordSlots.forEach((slot, slotIndex) => {
            const context = {
                chordName: slot.chordName,
                durationTicks: slot.effectiveDurationTicks,
                timeSignature: slot.timeSignature,
                startTick: section.startTick + slot.effectiveStartTickInSection,
                songData,
                sectionIndex,
                slotIndex
            };
            const phrase = generateBassPhraseForSlot(context, lastEvent, helpers);
            if (phrase.length > 0) {
                lastEvent = phrase[phrase.length - 1];
            }
            bassLine.push(...phrase);
        });
    });

    return bassLine;
}
