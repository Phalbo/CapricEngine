// File: main/app-ui-render.js
// Responsabile del rendering dell'output della canzone nell'HTML,
// inclusa la logica di caricamento on-demand per le diteggiature,
// la navigazione diteggiature (frecce/swipe/tap), e il nuovo stile sezioni.
// CORREZIONE per ripristinare rendering scala e glossario accordi.

/**
 * Crea un ID HTML valido da un nome di accordo.
 */
function sanitizeId(chordName) {
    if (typeof chordName !== 'string') return 'invalid_id';
    return chordName
        .replace(/#/g, 'sharp')
        .replace(/\//g, 'slash')
        .replace(/[^\w-]/g, '_');
}

/**
 * Aggiorna la visualizzazione di una singola entry del glossario accordi.
 */
function updateChordEntryDisplay(fundamentalChordName) {
    const chordData = glossaryChordData[fundamentalChordName];
    if (!chordData || !chordData.shapes || chordData.shapes.length === 0) {
        return;
    }

    const sanitizedId = sanitizeId(fundamentalChordName);
    const guitarDiagramDiv = document.getElementById(`guitar-${sanitizedId}`);
    const posIndicatorSpan = document.getElementById(`pos-indicator-${sanitizedId}`);

    if (typeof chordData.currentShapeIndex !== 'number' ||
        chordData.currentShapeIndex < 0 ||
        chordData.currentShapeIndex >= chordData.shapes.length) {
        chordData.currentShapeIndex = 0;
    }

    const currentShape = chordData.shapes[chordData.currentShapeIndex];

    if (guitarDiagramDiv && currentShape && typeof renderGuitarDiagram === 'function') {
        guitarDiagramDiv.innerHTML = renderGuitarDiagram(currentShape.guitarFrets);
    } else if (guitarDiagramDiv && typeof renderGuitarDiagram === 'function') {
        guitarDiagramDiv.innerHTML = renderGuitarDiagram(["x","x","x","x","x","x"]);
    }

    if (posIndicatorSpan) {
        if (chordData.shapes.length > 0 && currentShape) {
            posIndicatorSpan.innerHTML = `Pos&nbsp;${(chordData.currentShapeIndex || 0) + 1}&nbsp;/&nbsp;${chordData.shapes.length}`;
        } else {
            posIndicatorSpan.textContent = "N/A";
        }
    }
}

/**
 * Gestisce la navigazione tra le diteggiature.
 */
function navigateShape(fundamentalChordName, direction) {
    const chordData = glossaryChordData[fundamentalChordName];
    if (!chordData || !chordData.shapes || chordData.shapes.length === 0) return;

    let newIndex = (chordData.currentShapeIndex || 0) + direction;

    if (newIndex < 0) {
        newIndex = chordData.shapes.length - 1;
    } else if (newIndex >= chordData.shapes.length) {
        newIndex = 0;
    }
    chordData.currentShapeIndex = newIndex;
    if (chordData.shapes[newIndex]) {
        chordData.currentShapeKey = chordData.shapes[newIndex].shapeKey;
    }

    updateChordEntryDisplay(fundamentalChordName);
}


/**
 * Renderizza l'output completo della canzone nell'elemento songOutputDiv.
 */
async function renderSongOutput(songData, allGeneratedChordsSet, styleNote, mainScaleText, mainScaleParsedNotes, mainScaleParsedRoot, mainScaleParsedName) {
    const songOutputDiv = document.getElementById('songOutput');
    if (!songOutputDiv) {
        console.error("Elemento 'songOutput' non trovato nel DOM.");
        return;
    }

    const dependencies = {
        getCleanSectionName, normalizeChordNameToSharps, getChordRootAndType,
        renderGuitarDiagram, renderPianoDiagram, CHORD_LIB, QUALITY_DEFS,
        NOTE_NAMES, fetchChordVoicings, parseExternalFretString
    };
    for (const depName in dependencies) {
        if (typeof dependencies[depName] === 'undefined') {
            console.error(`renderSongOutput: Dipendenza globale mancante: ${depName}.`);
            songOutputDiv.innerHTML = "<p>Errore interno durante il rendering (dipendenza mancante). Controlla la console.</p>";
            return;
        }
    }

    const { displayTitle, bpm, timeSignatureChanges, sections, fullKeyName } = songData;
    const mood = document.getElementById('mood').value;
    const moodProfile = MOOD_PROFILES[mood] || MOOD_PROFILES["very_normal_person"];
    const finalStyleNote = styleNote || moodProfile.styleNotes || "Experiment.";


    let output = `<h3 class="song-title-main">${displayTitle}</h3><div class="song-main-info">`;
    output += `<p><strong>Mood:</strong> ${mood.replace(/_/g, ' ')}</p>`;
    output += `<p><strong>Key:</strong> ${fullKeyName || "N/A"}</p>`;
    output += `<p><strong>BPM:</strong> ${bpm} BPM</p>`;
    output += `<p id="initial-time-signature"><strong>Meter:</strong> ${timeSignatureChanges && timeSignatureChanges.length > 0 ? (timeSignatureChanges[0].ts[0] + '/' + timeSignatureChanges[0].ts[1]) : 'N/A'}</p>`;
    output += `<p id="estimated-duration"></p>`;
    output += `<p><strong>Style Notes:</strong> ${finalStyleNote}</p></div>`;

    // NUOVA TIMELINE PER LE SEZIONI
    output += `<div class="song-sections-timeline" id="song-timeline-container">`;
    sections.forEach((sectionData, sectionIndex) => {
        const cleanSectionNameForCssVar = getCleanSectionName(sectionData.name);
        const sectionTitleForDisplay = sectionData.name.replace(/-/g, ' ');
        const barCountActual = sectionData.measures;

        let barUnitWidth = 35;
        let minVisibleBars = 4;
        try {
            const rootStyles = getComputedStyle(document.documentElement);
            const barUnitWidthValue = rootStyles.getPropertyValue('--bar-unit-width').trim();
            const minVisibleBarsValue = rootStyles.getPropertyValue('--min-section-bar-display').trim();
            if (barUnitWidthValue) barUnitWidth = parseInt(barUnitWidthValue, 10) || 35;
            if (minVisibleBarsValue) minVisibleBars = parseInt(minVisibleBarsValue, 10) || 4;
        } catch(e) { /* Usa fallback */ }

        const displayBarUnits = Math.max(barCountActual, minVisibleBars);
        const sectionWidthPx = barUnitWidth * displayBarUnits;
        const sectionColorVarName = `--section-color-${cleanSectionNameForCssVar}`;

        output += `<div class="timeline-section-card" id="timeline-section-${sectionIndex}"
                        style="--section-color-var: var(${sectionColorVarName}, var(--section-color-default)); width: ${sectionWidthPx}px;">`;
        output += `  <div class="section-card-header">${sectionTitleForDisplay}</div>`;
        output += `  <div class="section-card-body">`;
        output += `    <div class="section-card-chords-container">`;
        const chordsString = sectionData.baseChords && sectionData.baseChords.length > 0 ? sectionData.baseChords.join(' | ') : '';
        output += `      <div class="section-card-chords" data-chords="${chordsString}" data-has-chords="${!!chordsString}"></div>`;
        output += `    </div>`;
        output += `    <div class="section-bars-label">${barCountActual} bars</div>`;
        output += `  </div>`;
        output += `  <div class="section-bar-grid" data-bar-count="${barCountActual}"></div>`;
        output += `</div>`;
    });
    output += `</div>`;

    // --- SEZIONE SCALA PRINCIPALE (RIPRISTINATA E CORRETTA) ---
    // Assicurati che l'elemento section abbia la classe .main-content-section per lo stile.
    output += `<section id="main-scale-display-section" class="main-content-section">`;
    output += `  <h3 class="section-header-title">Main Song Scale</h3>`; // Usa la classe corretta per i titoli
    output += `  <p><strong>${mainScaleText.replace(/<br\/?>/gi, ' ').replace(/<\/?em>/gi, '')}</strong></p>`;
    if (mainScaleParsedNotes && mainScaleParsedNotes.length > 0 && typeof renderGuitarScaleDiagram === "function" && typeof renderPianoScaleDiagram === "function") {
        output += `  <div class="main-scale-diagram-container">`;
        output += `    <div class="diagram main-scale-guitar">${renderGuitarScaleDiagram(mainScaleParsedNotes, mainScaleParsedRoot, mainScaleParsedName)}</div>`;
        output += `    <div class="diagram main-scale-piano">${renderPianoScaleDiagram(mainScaleParsedNotes, mainScaleParsedRoot, mainScaleParsedName)}</div>`;
        output += `  </div>`;
    } else {
        output += `  <p><em>(Scale diagrams not available)</em></p>`;
    }
    output += `</section>`;

    // --- GLOSSARIO ACCORDI (RIPRISTINATO E CORRETTO) ---
    // Assicurati che l'elemento section abbia la classe .main-content-section per lo stile.
    output += `<section id="chord-glossary-section" class="main-content-section">`;
    output += `  <h3 class="chord-glossary-title section-header-title">Used Chords Glossary:</h3>`; // Usa la classe corretta
    output += `  <div class="chord-glossary-grid" id="chord-glossary-grid-container">`;

    allGeneratedChordsSet.forEach(fundamentalChordName_normalized => {
        if (typeof fundamentalChordName_normalized !== 'string' || !fundamentalChordName_normalized.trim() || fundamentalChordName_normalized.includes("_ERR")) return;
        const sanitizedChordNameId = sanitizeId(fundamentalChordName_normalized);
        const chordEntryId = `entry-${sanitizedChordNameId}`;
        output += `    <div class="chord-entry" id="${chordEntryId}"><p style="text-align:center; padding-top: 20px;">Loading ${fundamentalChordName_normalized}...</p></div>`;
    });
    output += `  </div></section>`;

    songOutputDiv.innerHTML = output;

    // Popola la griglia delle barre e gli accordi per ogni sezione DOPO l'inserimento nel DOM
    document.querySelectorAll('.timeline-section-card').forEach(card => {
        const grid = card.querySelector('.section-bar-grid');
        const chordsDiv = card.querySelector('.section-card-chords');
        const chordsContainer = card.querySelector('.section-card-chords-container');

        if (grid) {
            const count = parseInt(grid.dataset.barCount, 10);
            if (count > 0) {
                grid.innerHTML = '';
                for (let i = 0; i < count; i++) {
                    const barSegment = document.createElement('div');
                    barSegment.className = 'bar-segment';
                    grid.appendChild(barSegment);
                }
            }
        }
        if (chordsDiv && chordsContainer) {
            const chordString = chordsDiv.dataset.chords;
            if (chordString && chordString.trim() !== '' && chordString !== '(No Chords)') { // Modificato il controllo
                const existingLabel = chordsContainer.querySelector('.section-card-chords-label');
                if (existingLabel) existingLabel.remove();

                const label = document.createElement('div');
                label.className = 'section-card-chords-label';
                label.textContent = 'Chords:';
                chordsContainer.insertBefore(label, chordsDiv);
                chordsDiv.textContent = chordString;
            } else {
                chordsDiv.textContent = '(Instrumental/Silence)';
                const existingLabel = chordsContainer.querySelector('.section-card-chords-label');
                if (existingLabel) existingLabel.remove();
            }
        }
    });

    // FASE 2: Carica e popola ogni entry del glossario asincronamente
    const chordLoadPromises = [];
    window.glossaryChordData = {};

    allGeneratedChordsSet.forEach(fundamentalChordName_normalized => {
        if (typeof fundamentalChordName_normalized !== 'string' || !fundamentalChordName_normalized.trim() || fundamentalChordName_normalized.includes("_ERR")) return;

        const promise = (async () => {
            const { root: chordRoot, type: chordSuffix } = getChordRootAndType(fundamentalChordName_normalized);
            let chordEntryInLib = CHORD_LIB[fundamentalChordName_normalized];

            if (!chordEntryInLib) {
                const qualityDef = Object.values(QUALITY_DEFS).find(q => q.suffix === chordSuffix);
                let notes = [];
                if (qualityDef && qualityDef.intervals) {
                    const rootIdx = NOTE_NAMES.indexOf(chordRoot);
                    if (rootIdx !== -1) notes = qualityDef.intervals.map(i => NOTE_NAMES[(rootIdx + i) % 12]);
                }
                chordEntryInLib = {
                    name: fundamentalChordName_normalized, notes, quality: qualityDef ? qualityDef.quality : "Unknown",
                    guitarFrets: ["x","x","x","x","x","x"], pianoNotes: [...notes], shapes: [], areVoicingsLoaded: false
                };
                CHORD_LIB[fundamentalChordName_normalized] = chordEntryInLib;
            }

            if (!chordEntryInLib.areVoicingsLoaded) {
                const positionsFromPHP = await fetchChordVoicings(chordRoot, chordSuffix);
                if (!Array.isArray(chordEntryInLib.shapes)) chordEntryInLib.shapes = [];

                let shapesToAddFromDB = [];
                if (positionsFromPHP && positionsFromPHP.length > 0) {
                    positionsFromPHP.forEach((posData, index) => {
                        if (posData.frets && Array.isArray(posData.frets)) {
                            const parsedFrets = parseExternalFretString(posData.frets);
                            shapesToAddFromDB.push({
                                shapeKey: sanitizeId(`${fundamentalChordName_normalized}_db_${index}`),
                                displayName: `Pos ${index + 1}` + (posData.barres && ((Array.isArray(posData.barres) && posData.barres.length > 0) || !Array.isArray(posData.barres)) ? ` (B${Array.isArray(posData.barres) ? posData.barres[0] : posData.barres})` : ''),
                                guitarFrets: parsedFrets,
                            });
                        }
                    });
                }

                if (shapesToAddFromDB.length > 0) {
                    chordEntryInLib.shapes = shapesToAddFromDB;
                }

                if ((chordEntryInLib.guitarFrets.every(f => f === "x")) && chordEntryInLib.shapes.length > 0) {
                    const firstValidShape = chordEntryInLib.shapes.find(s => s.guitarFrets && s.guitarFrets.some(f => f !== "x"));
                    if (firstValidShape) {
                        chordEntryInLib.guitarFrets = firstValidShape.guitarFrets;
                    }
                }
                chordEntryInLib.areVoicingsLoaded = true;
            }

            if(chordEntryInLib.shapes.length === 0){
                chordEntryInLib.shapes.push({
                    shapeKey: sanitizeId(`${fundamentalChordName_normalized}_ultimate_fallback_ui`),
                    displayName: "N/A",
                    guitarFrets: ["x","x","x","x","x","x"]
                });
                 if (chordEntryInLib.guitarFrets.every(f => f === "x")) {
                    chordEntryInLib.guitarFrets = ["x","x","x","x","x","x"];
                }
            }

          const randomIndexForShape = chordEntryInLib.shapes.length > 0 ?
                Math.floor(Math.random() * chordEntryInLib.shapes.length) : 0;

            glossaryChordData[fundamentalChordName_normalized] = {
                fundamentalDisplayName: fundamentalChordName_normalized,
                fundamentalNotes: chordEntryInLib.notes || [],
                fundamentalQuality: chordEntryInLib.quality || "Unknown",
                shapes: [...chordEntryInLib.shapes],
                currentShapeIndex: randomIndexForShape,
                currentShapeKey: chordEntryInLib.shapes.length > 0 ?
                    chordEntryInLib.shapes[randomIndexForShape].shapeKey :
                    sanitizeId(`${fundamentalChordName_normalized}_ultimate_fallback_ui`)
            };

            const currentFundamentalData = glossaryChordData[fundamentalChordName_normalized];
            const sanitizedChordNameId = sanitizeId(fundamentalChordName_normalized);
            const chordEntryId = `entry-${sanitizedChordNameId}`;
            const entryDiv = document.getElementById(chordEntryId);

            if (entryDiv) {
                let entryHtmlContent = `<strong>${currentFundamentalData.fundamentalDisplayName}</strong>`;
                entryHtmlContent += `<code>Notes: ${currentFundamentalData.fundamentalNotes.join(" ")}</code>`;
                entryHtmlContent += `<div class="diagram-container" data-chord="${fundamentalChordName_normalized}">`;

                let initialShapeToRender = currentFundamentalData.shapes[currentFundamentalData.currentShapeIndex || 0];
                if (!initialShapeToRender || !initialShapeToRender.guitarFrets) {
                    initialShapeToRender = { guitarFrets: ["x","x","x","x","x","x"], displayName: "N/A" };
                }

                entryHtmlContent += ` <div class="diagram guitar-diagram-area" id="guitar-${sanitizedChordNameId}">${renderGuitarDiagram(initialShapeToRender.guitarFrets)}</div>`;
                entryHtmlContent += ` <div class="diagram piano-diagram-area" id="piano-${sanitizedChordNameId}">${renderPianoDiagram(currentFundamentalData.fundamentalNotes)}</div></div>`;

                entryHtmlContent += `<div class="shape-navigation-controls">`;
                if (currentFundamentalData.shapes.length > 1) {
                    entryHtmlContent += `<button class="shape-nav-arrow prev-shape" data-chord="${fundamentalChordName_normalized}" aria-label="Previous shape">&#x276E;</button>`;
                    entryHtmlContent += `<span class="shape-position-indicator" id="pos-indicator-${sanitizedChordNameId}">Pos 1 / ${currentFundamentalData.shapes.length}</span>`;
                    entryHtmlContent += `<button class="shape-nav-arrow next-shape" data-chord="${fundamentalChordName_normalized}" aria-label="Next shape">&#x276F;</button>`;
                } else if (currentFundamentalData.shapes.length === 1 && initialShapeToRender.guitarFrets.some(f=>f !== 'x')) {
                    entryHtmlContent += `<span class="shape-position-indicator" id="pos-indicator-${sanitizedChordNameId}">Pos 1 / 1</span>`;
                } else {
                    entryHtmlContent += `<span class="shape-position-indicator" id="pos-indicator-${sanitizedChordNameId}">N/A</span>`;
                }
                entryHtmlContent += `</div>`;

                entryDiv.innerHTML = entryHtmlContent;

                entryDiv.querySelectorAll('.shape-nav-arrow').forEach(arrow => {
                    arrow.addEventListener('click', (e) => {
                        const chordName = e.currentTarget.dataset.chord;
                        const direction = e.currentTarget.classList.contains('prev-shape') ? -1 : 1;
                        navigateShape(chordName, direction);
                    });
                });

                const diagramContainerForInteraction = entryDiv.querySelector('.diagram-container');
                if (diagramContainerForInteraction && currentFundamentalData.shapes.length > 1) {
                    let touchstartX = 0; let touchstartY = 0;
                    const swipeThreshold = 50;
                    const tapMaxTime = 250;
                    let touchStartTime = 0;

                    diagramContainerForInteraction.addEventListener('touchstart', function(event) {
                        touchstartX = event.changedTouches[0].screenX;
                        touchstartY = event.changedTouches[0].screenY;
                        touchStartTime = new Date().getTime();
                    }, {passive: true});

                    diagramContainerForInteraction.addEventListener('touchend', function(event) {
                        const touchendX = event.changedTouches[0].screenX;
                        const touchendY = event.changedTouches[0].screenY;
                        const chordName = event.currentTarget.dataset.chord;
                        const timeDiff = new Date().getTime() - touchStartTime;
                        const xDiff = touchendX - touchstartX;
                        const yDiff = touchendY - touchstartY;

                        if (timeDiff < tapMaxTime && Math.abs(xDiff) < 20 && Math.abs(yDiff) < 20) {
                            const rect = event.currentTarget.getBoundingClientRect();
                            const tapXrelative = event.changedTouches[0].clientX - rect.left;
                            if (tapXrelative < rect.width / 2) { navigateShape(chordName, -1); }
                            else { navigateShape(chordName, 1); }
                            return;
                        }
                        if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) >= swipeThreshold) {
                            if (xDiff < 0) { navigateShape(chordName, 1); }
                            else { navigateShape(chordName, -1); }
                        }
                    }, {passive: true});
                }
            }
        })();
        chordLoadPromises.push(promise);
    });

    Promise.all(chordLoadPromises)
        .then(() => {
            // Chiamare updateEstimatedSongDuration DOPO che tutto il resto è stato renderizzato
            if (typeof updateEstimatedSongDuration === "function") {
                updateEstimatedSongDuration();
            }
        })
        .catch(mainError => {
            console.error("ERRORE PRINCIPALE DURANTE PROMISE.ALL PER IL GLOSSARIO:", mainError, mainError.stack);
            if (typeof updateEstimatedSongDuration === "function") {
                updateEstimatedSongDuration(); // Chiama anche in caso di errore
            }
        });
}


/**
 * Aggiorna la stima della durata della canzone nell'UI.
 */
function updateEstimatedSongDuration() {
    if (!currentMidiData || !currentMidiData.bpm || !currentMidiData.sections) return;
    let estimatedTotalSeconds = 0;
    currentMidiData.sections.forEach(section => {
        const sectionTS = section.timeSignature;
        const beatsPerMeasureInSection = sectionTS[0];
        const beatUnitValueInSection = sectionTS[1];
        const ticksPerBeatForThisSectionCalc = (4 / beatUnitValueInSection) * (TICKS_PER_QUARTER_NOTE_REFERENCE || 128);
        const sectionDurationTicks = section.measures * beatsPerMeasureInSection * ticksPerBeatForThisSectionCalc;
        estimatedTotalSeconds += (sectionDurationTicks / (TICKS_PER_QUARTER_NOTE_REFERENCE || 128)) * (60 / currentMidiData.bpm);
    });
    const minutes = Math.floor(estimatedTotalSeconds / 60);
    const seconds = Math.round(estimatedTotalSeconds % 60);
    const durationString = `${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec`;
    const durationElement = document.getElementById('estimated-duration');
    if (durationElement) {
        durationElement.innerHTML = `<strong>Estimated Duration:</strong> ${durationString}`;
    }
}
