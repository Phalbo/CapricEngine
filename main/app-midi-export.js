// File: main/app-midi-export.js
// Gestisce l'esportazione MIDI e il salvataggio dei dati testuali.
// Modificato per utilizzare detailedHarmonicEvents e per la nuova logica dei pulsanti.
// Aggiunta rimozione sovrapposizioni in handleGenerateChordRhythm.

/**
 * Costruisce la stringa di testo con i dettagli della canzone per il salvataggio.
 * Popola la variabile globale currentSongDataForSave.
 */
function buildSongDataForTextFile() {
    if (!currentMidiData) {
        currentSongDataForSave = {title: "Error", content: "No song data available."};
        return;
    }

    const {title, bpm, timeSignatureChanges, sections, keySignatureRoot, keyModeName, fullKeyName, capriceNum} = currentMidiData;
    const mood = document.getElementById('mood').value;
    const styleNote = (typeof moodToStyleNotes !== 'undefined' && moodToStyleNotes[mood]) ? moodToStyleNotes[mood] : "Experiment.";
    // Assicurati che TICKS_PER_QUARTER_NOTE_REFERENCE sia disponibile globalmente
    const TPQN_TEXT = typeof TICKS_PER_QUARTER_NOTE_REFERENCE !== 'undefined' ? TICKS_PER_QUARTER_NOTE_REFERENCE : 128;


    let songDataText = `${title}\nMood: ${mood.replace(/_/g, ' ')}\nKey: ${fullKeyName || (keySignatureRoot + " " + keyModeName)}\nBPM: ${bpm}\n`;

    if (timeSignatureChanges && timeSignatureChanges.length === 1) {
        songDataText += `Meter: ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]}\n`;
    } else if (timeSignatureChanges && timeSignatureChanges.length > 1) {
        let uniqueTimeSignatures = new Set(timeSignatureChanges.map(tc => `${tc.ts[0]}/${tc.ts[1]}`));
        if (uniqueTimeSignatures.size > 1) {
            songDataText += `Meter: Variable (starts ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]})\n`;
        } else {
            songDataText += `Meter: ${timeSignatureChanges[0].ts[0]}/${timeSignatureChanges[0].ts[1]}\n`;
        }
    } else {
        songDataText += `Meter: N/A\n`;
    }
    songDataText += `Style Notes: ${styleNote}\n\nSTRUCTURE AND CHORDS:\n`;

    sections.forEach(sectionData => {
        const sectionTS = sectionData.timeSignature;
        const ticksPerBeatInSection = (4 / sectionTS[1]) * TPQN_TEXT;

        songDataText += `\n--- ${sectionData.name.toUpperCase()} (${sectionData.measures} bars in ${sectionTS[0]}/${sectionTS[1]}) ---\n`;

        if (sectionData.baseChords && sectionData.baseChords.length > 0) {
            songDataText += `Accordi Principali: [ ${sectionData.baseChords.join(' | ')} ]\n`;
        } else {
            songDataText += `Accordi Principali: (None/Silence)\n`;
        }

        songDataText += `Ritmo Armonico Dettagliato (per battuta):\n`;
        if (sectionData.detailedHarmonicEvents && sectionData.detailedHarmonicEvents.length > 0) {
            let currentMeasureNumber = 1;
            let ticksWithinCurrentMeasureRendered = 0; // Tick all'interno della misura corrente nel testo
            let measureOutput = `Bar ${currentMeasureNumber}: `;
            const ticksPerMeasureInSection = sectionTS[0] * ticksPerBeatInSection;

            sectionData.detailedHarmonicEvents.forEach((event, index) => {
                const eventStartTickInSection = event.startTickInSection;
                const eventMeasureNumber = Math.floor(eventStartTickInSection / ticksPerMeasureInSection) + 1;

                if (eventMeasureNumber > currentMeasureNumber) {
                    songDataText += measureOutput.trim().replace(/\|$/, '').trim() + '\n';
                    for (let m = currentMeasureNumber + 1; m < eventMeasureNumber; m++) {
                        songDataText += `Bar ${m}: (continuation or silence)\n`;
                    }
                    currentMeasureNumber = eventMeasureNumber;
                    measureOutput = `Bar ${currentMeasureNumber}: `;
                    ticksWithinCurrentMeasureRendered = 0;
                }
                
                // Calcola l'offset dell'evento all'interno della sua battuta logica
                const eventOffsetInItsMeasure = eventStartTickInSection % ticksPerMeasureInSection;

                // Se l'evento non inizia subito dove finiva il precedente (all'interno della stessa battuta testuale)
                if (eventOffsetInItsMeasure > ticksWithinCurrentMeasureRendered + (TPQN_TEXT / 32) && measureOutput !== `Bar ${currentMeasureNumber}: ` ) {
                     // Potrebbe esserci un silenzio implicito, non lo segno per ora per non affollare
                }

                let durationInBeats = (event.durationTicks / ticksPerBeatInSection);
                // Formattazione per togliere .00 e .50
                let durationString = durationInBeats.toFixed(2);
                if (durationString.endsWith('.00')) {
                    durationString = durationString.substring(0, durationString.length - 3);
                } else if (durationString.endsWith('0') && durationString.includes('.')) {
                    durationString = durationString.substring(0, durationString.length - 1);
                }
                
                let chordDisplayName = event.chordName;
                if (event.isPassing) chordDisplayName += " (pass)";
                if (event.isHit) chordDisplayName += " (hit)";
                chordDisplayName += ` (${durationString}b)`;

                if (measureOutput === `Bar ${currentMeasureNumber}: `) {
                    measureOutput += chordDisplayName;
                } else {
                    measureOutput += ` | ${chordDisplayName}`;
                }
                ticksWithinCurrentMeasureRendered = eventOffsetInItsMeasure + event.durationTicks;
            });
            songDataText += measureOutput.trim().replace(/\|$/, '').trim() + '\n'; // Assicura che l'ultima misura sia scritta

            // Aggiungi righe per eventuali battute finali della sezione che sono vuote (improbabile con la logica attuale ma per sicurezza)
            const totalMeasuresRendered = currentMeasureNumber;
            if (sectionData.measures > totalMeasuresRendered) {
                for (let m = totalMeasuresRendered + 1; m <= sectionData.measures; m++) {
                     songDataText += `Bar ${m}: (continuation or silence)\n`;
                }
            }


        } else {
            songDataText += `(Nessun evento armonico dettagliato per questa sezione)\n`;
        }

        const cleanSectionNameForLogic = (typeof getCleanSectionName === 'function') ? getCleanSectionName(sectionData.name) : sectionData.name.toLowerCase();
        if (cleanSectionNameForLogic === "bridge-mod" || ( (["bridge", "middle8"].includes(cleanSectionNameForLogic)) && mood !== "very_normal_person" ) ) {
            songDataText += `  Note: Section with potential modulation or strong harmonic contrast.\n`;
        }
    });

    let estimatedTotalSeconds = 0;
    sections.forEach(section => {
        const sectionTS = section.timeSignature;
        const beatsPerMeasureInSection = sectionTS[0];
        const beatUnitValueInSection = sectionTS[1];
        const ticksPerBeatForThisSectionCalc = (4 / beatUnitValueInSection) * TPQN_TEXT;
        const sectionDurationTicks = section.measures * beatsPerMeasureInSection * ticksPerBeatForThisSectionCalc;
        estimatedTotalSeconds += (sectionDurationTicks / TPQN_TEXT) * (60 / bpm);
    });
    const minutes = Math.floor(estimatedTotalSeconds / 60);
    const seconds = Math.round(estimatedTotalSeconds % 60);
    songDataText += `\nEstimated Total Duration: ${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec\n`;

    songDataText += "\n\nCHORD GLOSSARY (unique chords used):\n";
    let chordsInGlossary = 0;
    const uniqueChordsForGlossary = new Set();
    sections.forEach(sec => {
        if (sec.detailedHarmonicEvents) {
            sec.detailedHarmonicEvents.forEach(ev => uniqueChordsForGlossary.add(ev.chordName));
        } else if (sec.baseChords) { // Fallback se detailedHarmonicEvents non c'è
            sec.baseChords.forEach(ch => uniqueChordsForGlossary.add(ch));
        }
    });

    uniqueChordsForGlossary.forEach(chordName => {
        if (glossaryChordData[chordName] && Object.hasOwnProperty.call(glossaryChordData, chordName)) {
            chordsInGlossary++;
            const data = glossaryChordData[chordName];
            songDataText += `\n${data.fundamentalDisplayName}:\n  Quality: ${data.fundamentalQuality}\n  Notes (root pos.): ${data.fundamentalNotes.join(" ")}\n`;
            const firstShape = data.shapes && data.shapes.length > 0 ? data.shapes[0] : null;
            if(firstShape && firstShape.guitarFrets){songDataText += `  Guitar (fingering '${firstShape.displayName}'): ${firstShape.guitarFrets.join('-')}\n`;}
        } else if (CHORD_LIB && CHORD_LIB[chordName]) { // Prendi info da CHORD_LIB se non nel glossaryChordData specifico
            chordsInGlossary++;
            const data = CHORD_LIB[chordName];
            songDataText += `\n${data.fullName || chordName}:\n  Quality: ${data.quality}\n  Notes (root pos.): ${data.notes.join(" ")}\n`;
        }
    });

    if (chordsInGlossary === 0) {
         songDataText += "No specific chords in glossary.\n";
    }
    currentSongDataForSave = {title: title, content: songDataText};
}


/**
 * Gestisce il salvataggio dei dettagli della canzone in un file di testo.
 */
function handleSaveSong() {
    buildSongDataForTextFile();
    if(!currentSongDataForSave || !currentSongDataForSave.content) {
        console.warn("Nessun dato della canzone da salvare.");
        alert("Nessun dato della canzone da salvare. Genera prima una canzone.");
        return;
    }
    const blob = new Blob([currentSongDataForSave.content],{type:'text/plain;charset=utf-8'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href',url);
    const fileName = (currentSongDataForSave.title || "Phalbo_Caprice").replace(/[^\w\s.-]/gi,'_').replace(/\s+/g,'_') + '.txt';
    link.setAttribute('download',fileName);
    link.style.visibility='hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Funzione generica per scaricare una singola traccia MIDI (Tipo 0).
 */
function downloadSingleTrackMidi(trackName, midiEvents, fileName, bpm, timeSignatureChangesArray, instrumentId = 0, isDrumTrack = false) {
    if (!isDrumTrack && (!midiEvents || midiEvents.length === 0)) {
         alert("Nessun evento MIDI generato per questa traccia.");
         return;
    }
    if (typeof MidiWriter === 'undefined') {
        console.error("Libreria MidiWriter.js non trovata.");
        alert("Errore interno: libreria MIDI mancante.");
        return;
    }
    if (typeof recalculateTimeSignatureChangesAndSectionTicks === "function") {
        recalculateTimeSignatureChangesAndSectionTicks(); // Assicura che currentMidiData.timeSignatureChanges sia aggiornato
    }

    const track = new MidiWriter.Track();
    track.setTempo(bpm, 0);
    track.addTrackName(trackName);

    // Usa i timeSignatureChanges globali da currentMidiData se disponibili e corretti
    const actualTimeSignatures = (currentMidiData && currentMidiData.timeSignatureChanges && currentMidiData.timeSignatureChanges.length > 0)
                                 ? currentMidiData.timeSignatureChanges
                                 : (timeSignatureChangesArray && timeSignatureChangesArray.length > 0 ? timeSignatureChangesArray : [{tick: 0, ts: [4,4]}]);

    actualTimeSignatures.forEach(tsEvent => {
        track.addEvent(new MidiWriter.TimeSignatureEvent(tsEvent.ts[0], tsEvent.ts[1]), {tick: Math.round(tsEvent.tick)});
    });


    if (midiEvents && midiEvents.length > 0) {
        midiEvents.forEach(event => {
            if (!event || typeof event.pitch === 'undefined' || !event.duration || typeof event.startTick === 'undefined') {
                return;
            }
            const pitchArray = Array.isArray(event.pitch) ? event.pitch : [event.pitch];
            // Assicurati che la durata sia nel formato corretto per MidiWriter (es. "T128", non solo numero)
            const durationString = typeof event.duration === 'string' && event.duration.startsWith('T') ? event.duration : `T${Math.round(event.duration)}`;

            const noteEventArgs = {
                pitch: pitchArray.filter(p => p !== null && p >=0 && p <=127), // Filtra note MIDI valide
                duration: durationString,
                startTick: Math.round(event.startTick),
                velocity: event.velocity || (isDrumTrack ? 90 : 70),
                channel: isDrumTrack ? 10 : 1
            };
            if (noteEventArgs.pitch.length === 0) return; // Salta se non ci sono note valide dopo il filtro

            try {
                track.addEvent(new MidiWriter.NoteEvent(noteEventArgs));
            } catch (e) {
                console.error("Errore durante l'aggiunta di NoteEvent:", e, "Dati evento:", noteEventArgs);
            }
        });
    }

    const writer = new MidiWriter.Writer([track]);
    const dataUri = writer.dataUri();
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName.replace(/[^\w\s.-]/gi,'_').replace(/\s+/g,'_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/**
 * Gestisce la generazione e il download del MIDI degli accordi "PAD" (sostenuti) su traccia singola.
 * Usa `detailedHarmonicEvents` e suona solo accordi principali.
 */
function handleGenerateSingleTrackChordMidi() {
    if (!currentMidiData || !currentMidiData.sections) { alert("Genera prima una canzone."); return; }
    // Assicurati che TICKS_PER_QUARTER_NOTE_REFERENCE sia disponibile
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const { title, bpm, sections, capriceNum, timeSignatureChanges } = currentMidiData;
    const chordMIDIEvents = [];

    sections.forEach(sectionData => {
        if (sectionData.detailedHarmonicEvents && sectionData.detailedHarmonicEvents.length > 0) {
            sectionData.detailedHarmonicEvents.forEach(eventDetail => {
                if (eventDetail.chordName && (!eventDetail.isPassing && !eventDetail.isHit) && eventDetail.durationTicks > 0) {
                    const chordDefinition = CHORD_LIB[eventDetail.chordName] || (typeof getChordNotes === 'function' ? getChordNotes(getChordRootAndType(eventDetail.chordName).root, getChordRootAndType(eventDetail.chordName).type) : null);

                    if (chordDefinition && chordDefinition.notes && chordDefinition.notes.length > 0) {
                        const midiNoteNumbers = chordDefinition.notes.map(noteName => {
                            let note = noteName.charAt(0).toUpperCase() + noteName.slice(1);
                            if (note.length > 1 && (note.charAt(1) === 'b')) { note = note.charAt(0) + 'b'; }
                            let pitch = NOTE_NAMES.indexOf(note);
                            if (pitch === -1) {
                                const sharpMap = {"Db":"C#", "Eb":"D#", "Fb":"E", "Gb":"F#", "Ab":"G#", "Bb":"A#", "Cb":"B"};
                                const mappedNote = sharpMap[noteName];
                                if (mappedNote) pitch = NOTE_NAMES.indexOf(mappedNote);
                                else pitch = NOTE_NAMES.indexOf(noteName);
                            }
                            return (pitch !== -1) ? pitch + 48 : null;
                        }).filter(n => n !== null);

                        if (midiNoteNumbers.length > 0) {
                            chordMIDIEvents.push({
                                pitch: midiNoteNumbers,
                                duration: `T${Math.round(eventDetail.durationTicks)}`,
                                startTick: sectionData.startTick + eventDetail.startTickInSection,
                                velocity: 60,
                            });
                        }
                    }
                }
            });
        }
    });
    const midiFileNameST = `Phalbo_Caprice_n${capriceNum}_Chords_Pad.mid`;
    downloadSingleTrackMidi(`${title} - Chords (Pad)`, chordMIDIEvents, midiFileNameST, bpm, timeSignatureChanges, 0);
}

/**
 * Handler per generare e scaricare gli accordi con ritmo.
 * Adattato per iterare su detailedHarmonicEvents e preparare la chiamata a generateChordRhythmEvents.
 * Aggiunta rimozione sovrapposizioni.
 */
function handleGenerateChordRhythm() {
    if (!currentMidiData || !currentMidiData.sections) { alert("Genera prima una canzone."); return; }
    if (typeof generateChordRhythmEvents !== "function") {
        alert("Errore interno: Funzione generateChordRhythmEvents non trovata.");
        return;
    }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const chordRhythmBtn = document.getElementById('generateChordRhythmButton');
    if (chordRhythmBtn) { chordRhythmBtn.disabled = true; chordRhythmBtn.textContent = "Creating Rhythm..."; }

    try {
        let allRhythmicChordEvents = [];
        const helpers = {
            getRandomElement: (typeof getRandomElement === 'function' ? getRandomElement : () => null),
            getChordNotes: (typeof getChordNotes === 'function' ? getChordNotes : () => ({notes:[], qualityName:''})),
            getChordRootAndType: (typeof getChordRootAndType === 'function' ? getChordRootAndType : () => ({root:null, type:''}))
        };

        currentMidiData.sections.forEach(section => {
            if (section.detailedHarmonicEvents && section.detailedHarmonicEvents.length > 0) {
                section.detailedHarmonicEvents.forEach(harmonicEvent => {
                    if (harmonicEvent.chordName && (!harmonicEvent.isPassing && !harmonicEvent.isHit) && harmonicEvent.durationTicks > (TICKS_PER_QUARTER_NOTE_REFERENCE / 8) ) { // Durata minima sensata
                        const slotContext = {
                            chordName: harmonicEvent.chordName,
                            startTickAbsolute: section.startTick + harmonicEvent.startTickInSection,
                            durationTicks: harmonicEvent.durationTicks,
                            timeSignature: section.timeSignature
                        };
                        const eventsForThisSlot = generateChordRhythmEvents(
                            currentMidiData, // Passa songMidiData per BPM etc., anche se non lo usa per il loop principale
                            CHORD_LIB,
                            NOTE_NAMES,
                            helpers,
                            slotContext // Il contesto specifico per questo slot
                        );
                        if (eventsForThisSlot) {
                            allRhythmicChordEvents.push(...eventsForThisSlot);
                        }
                    }
                });
            }
        });

        // --- NUOVO: Rimozione Sovrapposizioni per Chord Rhythm ---
        if (allRhythmicChordEvents.length > 1) {
            allRhythmicChordEvents.sort((a, b) => a.startTick - b.startTick); // Ordina per startTick

            for (let i = 0; i < allRhythmicChordEvents.length - 1; i++) {
                const currentEvent = allRhythmicChordEvents[i];
                const nextEvent = allRhythmicChordEvents[i+1];
                const currentEventDurationNum = parseInt(currentEvent.duration.substring(1)); // "T128" -> 128

                if (currentEvent.startTick + currentEventDurationNum > nextEvent.startTick) {
                    const newDurationNum = nextEvent.startTick - currentEvent.startTick;
                    if (newDurationNum >= (TICKS_PER_QUARTER_NOTE_REFERENCE / 16) ) { // Durata minima (es. 64esimo)
                        currentEvent.duration = `T${newDurationNum}`;
                    } else {
                        // Se la nuova durata è troppo breve, potremmo rimuovere l'evento corrente o il successivo.
                        // Per ora, accorciamo e basta, anche se potrebbe risultare in note brevissime.
                        // Una logica più complessa potrebbe rimuovere l'evento più corto o quello meno importante.
                        currentEvent.duration = `T${Math.max(1, TICKS_PER_QUARTER_NOTE_REFERENCE / 16)}`; // Forza durata minima
                    }
                }
            }
            // Filtra eventi con durata nulla o negativa che potrebbero risultare
            allRhythmicChordEvents = allRhythmicChordEvents.filter(event => parseInt(event.duration.substring(1)) > 0);
        }
        // --- FINE NUOVO ---


        if (allRhythmicChordEvents && allRhythmicChordEvents.length > 0) {
            const fileName = `Phalbo_Caprice_n${currentMidiData.capriceNum || 'X'}_Chords_Rhythm.mid`;
            downloadSingleTrackMidi(
                `${currentMidiData.title} - Chords Rhythm`,
                allRhythmicChordEvents,
                fileName,
                currentMidiData.bpm,
                currentMidiData.timeSignatureChanges,
                0
            );
        } else {
            alert("Impossibile generare accordi ritmici con i dati attuali.");
        }
    } catch (e) {
        console.error("Errore durante la generazione degli accordi ritmici:", e, e.stack);
        alert("Errore critico durante la generazione degli accordi ritmici. Controlla la console.");
    } finally {
        if (chordRhythmBtn) { chordRhythmBtn.disabled = false; chordRhythmBtn.textContent = "Chords Rhythm"; }
    }
}


function handleGenerateMelody() {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Dati canzone, sezioni o scala principale mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateMelodyForSong !== "function") { alert("Errore interno: Funzione melodia (generateMelodyForSong) non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }

    const melodyBtn = document.getElementById('generateMelodyButton');
    if(melodyBtn) { melodyBtn.disabled = true; melodyBtn.textContent = "Creating Fake Insp...";}
    try {
        const generatedMelody = generateMelodyForSong(
            currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot,
            CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats,
            getChordNotes, getNoteName, getRandomElement, getChordRootAndType
        );
        if (generatedMelody && generatedMelody.length > 0) {
            const melodyFileName = `Phalbo_Caprice_melody_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Melody for ${currentMidiData.displayTitle}`, generatedMelody, melodyFileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0
            );
        } else { alert("Impossibile generare 'Fake Inspiration' con i dati attuali. Riprova o cambia parametri."); }
    } catch (e) {
        console.error("Errore critico durante l'esecuzione di generateMelodyForSong:", e, e.stack);
        alert("Errore critico durante la generazione di 'Fake Inspiration'. Controlla la console.");
    }
    finally { if(melodyBtn){ melodyBtn.disabled = false; melodyBtn.textContent = "don't click again!"; } }
}

function handleGenerateVocalLine() {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Dati canzone, sezioni o scala principale mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateVocalLineForSong !== "function") { alert("Errore interno: Funzione generateVocalLineForSong non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }

    const vocalBtn = document.getElementById('generateVocalLineButton');
    if (vocalBtn) { vocalBtn.disabled = true; vocalBtn.textContent = "Creating Vocal Line..."; }
    try {
        const options = { globalRandomActivationProbability: 0.6 };
        const vocalLine = generateVocalLineForSong(
            currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot,
            CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats,
            getChordNotes, getNoteName, getRandomElement, getChordRootAndType,
            options
        );
        if (vocalLine && vocalLine.length > 0) {
            const fileName = `Phalbo_Caprice_vocal_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Vocal for ${currentMidiData.displayTitle}`, vocalLine, fileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0
            );
        } else { alert("Impossibile generare una linea vocale con i dati attuali."); }
    } catch (e) {
        console.error("Errore durante la generazione della linea vocale:", e, e.stack);
        alert("Errore critico durante la generazione della linea vocale. Controlla la console.");
    }
    finally { if (vocalBtn) { vocalBtn.disabled = false; vocalBtn.textContent = "Vocal Shame Machine"; } }
}

function handleGenerateBassLine() {
    if (!currentMidiData || !currentMidiData.sections || !currentMidiData.mainScaleNotes || currentMidiData.mainScaleNotes.length === 0) {
        alert("Dati canzone, sezioni o scala principale mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateBassLineForSong !== "function") { alert("Errore interno: Funzione generateBassLineForSong non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const bassBtn = document.getElementById('generateBassLineButton');
    if (bassBtn) { bassBtn.disabled = true; bassBtn.textContent = "Creating Bass Line..."; }
    try {
        const options = { globalRandomActivationProbability: 0.5 };
        const bassLine = generateBassLineForSong(
            currentMidiData, currentMidiData.mainScaleNotes, currentMidiData.mainScaleRoot,
            CHORD_LIB, scales, NOTE_NAMES, allNotesWithFlats,
            getChordNotes, getNoteName, getRandomElement, getChordRootAndType,
            options
        );
        if (bassLine && bassLine.length > 0) {
            const fileName = `Phalbo_Caprice_bass_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Bass for ${currentMidiData.displayTitle}`, bassLine, fileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0
            );
        } else { alert("Impossibile generare una linea di basso con i dati attuali."); }
    } catch (e) {
        console.error("Errore durante la generazione della linea di basso:", e, e.stack);
        alert("Errore critico durante la generazione della linea di basso. Controlla la console.");
    }
    finally { if (bassBtn) { bassBtn.disabled = false; bassBtn.textContent = "Deekonizer (bass)"; } }
}

function handleGenerateDrumTrack() {
    if (!currentMidiData || !currentMidiData.sections || currentMidiData.sections.length === 0 ||
        !currentMidiData.bpm || !currentMidiData.timeSignatureChanges || currentMidiData.timeSignatureChanges.length === 0 ) {
        alert("Dati canzone (BPM, cambi di time signature, sezioni) mancanti. Genera prima una struttura completa."); return;
    }
    if (typeof generateDrumTrackForSong !== "function") { alert("Errore interno: Funzione generateDrumTrackForSong non trovata."); return; }
    if (typeof TICKS_PER_QUARTER_NOTE_REFERENCE === 'undefined') { console.error("TICKS_PER_QUARTER_NOTE_REFERENCE non definito!"); return; }


    const drumBtn = document.getElementById('generateDrumTrackButton');
    if (drumBtn) { drumBtn.disabled = true; drumBtn.textContent = "Creating Drum Track..."; }

    try {
        const drumTrackOptions = { globalRandomActivationProbability: 0.6, fillFrequency: 0.25 };
        const drumEvents = generateDrumTrackForSong(
            currentMidiData, currentMidiData.bpm, null, currentMidiData.sections,
            CHORD_LIB, NOTE_NAMES, getRandomElement, drumTrackOptions
        );
        if (drumEvents && drumEvents.length > 0) {
            const fileName = `Phalbo_Caprice_drums_n${currentMidiData.capriceNum || 'X'}.mid`;
            downloadSingleTrackMidi(
                `Drums for ${currentMidiData.displayTitle}`, drumEvents, fileName,
                currentMidiData.bpm, currentMidiData.timeSignatureChanges, 0, true
            );
        } else { alert("Impossibile generare una traccia di batteria con i dati attuali."); }
    } catch (e) {
        console.error("Errore durante la generazione della traccia di batteria:", e, e.stack);
        alert("Errore critico durante la generazione della traccia di batteria. Controlla la console: " + e.message);
    }
    finally { if (drumBtn) { drumBtn.disabled = false; drumBtn.textContent = "LingoStarr (drum)"; } }
}