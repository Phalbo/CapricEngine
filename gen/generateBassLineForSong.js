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

// Libreria estensibile di pattern ritmici (durate in beat)
const BASS_RHYTHMIC_PATTERNS = {
  '4/4': [
    { name: "Standard", pattern: [1, 1, 1, 1] },
    { name: "DottedGroove", pattern: [1.5, 0.5, 2] },
    { name: "HalfNotes", pattern: [2, 2] },
    { name: "SyncopatedPush", pattern: [1, 0.5, 1.5, 1] },
    { name: "BackbeatStab", pattern: [1, 1, 0.5, 0.5, 1] },
    { name: "WalkingRoots", pattern: [1, 1, 1, 1] },
    { name: "QuarterPlusTriplet", pattern: [1, 0.66, 0.66, 0.66, 1] },
    { name: "PushPull", pattern: [0.75, 0.75, 1.5, 1] },
    { name: "GhostNoteStab", pattern: [1, 0.25, 0.75, 1, 1] },
    { name: "TensionRelease", pattern: [0.5, 0.5, 1, 2] }
  ],
  '3/4': [
    { name: "Waltz", pattern: [1, 1, 1] },
    { name: "WaltzOffbeat", pattern: [0.5, 1.5, 1] },
    { name: "OnTwo", pattern: [2, 1] },
    { name: "TripletFeel", pattern: [1.5, 0.75, 0.75] },
    { name: "BrokenStep", pattern: [1, 0.5, 0.5, 1] }
  ],
  funk: [
    { name: "FunkBounce", pattern: [0.5, 0.5, 1, 0.5, 0.5, 1] },
    { name: "StaccatoGroove", pattern: [0.25, 0.25, 0.5, 1, 0.5, 1.5] },
    { name: "PushTheOne", pattern: [0.75, 0.75, 1.5, 1] },
    { name: "GhostStep", pattern: [0.25, 0.25, 1, 1, 1.5] }
  ],
  reggae: [
    { name: "Roots", pattern: [2, 2] },
    { name: "SkipOne", pattern: [0.5, 1.5, 2] },
    { name: "OneDrop", pattern: [1.5, 0.5, 2] }
  ],
  disco: [
    { name: "FourOnFloor", pattern: [1, 1, 1, 1] },
    { name: "PulseDrive", pattern: [0.5, 0.5, 1, 0.5, 0.5, 1] },
    { name: "OffbeatGroove", pattern: [1.5, 0.5, 1, 1] }
  ],
  altrock: [
    { name: "BrokenRock", pattern: [2, 1, 1] },
    { name: "DropStep", pattern: [1, 2, 1] },
    { name: "HookRiff", pattern: [0.5, 0.5, 1, 2] }
  ]
};

function generateBassPhraseForSlot(context, lastEvent, helpers) {
    const { chordName, durationTicks, timeSignature, songData, sectionIndex, slotIndex, forceRootOnDownbeat = true } = context;
    const { getChordRootAndType, getChordNotes, getRandomElement } = helpers;
    const phraseEvents = [];
    const ticksPerBeat = (4 / timeSignature[1]) * TICKS_PER_QUARTER_NOTE_REFERENCE;
    const tsKey = `${timeSignature[0]}/${timeSignature[1]}`;
    const patterns = BASS_RHYTHMIC_PATTERNS[tsKey] || BASS_RHYTHMIC_PATTERNS['4/4'];
    const rhythmPattern = getRandomElement(patterns).pattern;

    let currentTick = 0;
    rhythmPattern.forEach((durationInBeats, index) => {
        if (currentTick >= durationTicks) return;

        const isFirstBeat = index === 0;
        const durationInTicks = durationInBeats * ticksPerBeat;
        const actualDuration = Math.min(durationInTicks, durationTicks - currentTick);

        let pitch = selectBassPitch({
            chord: { chordName },
            isFirstBeat: isFirstBeat,
            lastNote: phraseEvents.length > 0 ? phraseEvents[phraseEvents.length - 1] : lastEvent,
            songData,
            sectionIndex,
            slotIndex,
            forceRootOnDownbeat: forceRootOnDownbeat && isFirstBeat && Math.random() < 0.7
        }, helpers);

        pitch = Math.max(28, Math.min(55, pitch));

        phraseEvents.push({
            pitch: [pitch],
            duration: `T${actualDuration}`,
            startTick: context.startTick + currentTick,
            velocity: 75 + Math.floor(Math.random() * 10)
        });
        currentTick += actualDuration;
    });

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
