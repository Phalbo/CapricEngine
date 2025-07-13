Report sullo Stato di Avanzamento e Modifiche di CapricEngine
Data: 13 Luglio 2025

‧       rhythm-patterns.json / rhythm-patterns.js: Definizione e loader di pattern ritmici generici (strumming, arpeggi).
       config-music-data.js: Contiene costanti e dati musicali statici (TICKS_PER_QUARTER_NOTE_REFERENCE, NOTE_NAMES, allNotesWithFlats, QUALITY_DEFS, scales, MOOD_SONG_STRUCTURES, SECTION_DURATION_GUIDELINES, SECTION_CHORD_TARGETS, TIME_SIGNATURES_BY_MOOD, bpmRanges, moodToStyleNotes) e carica le template da song-structures.json tramite loadSongStructures()
       song-structures.json: Elenco delle "structure template" selezionabili dall'UI.


Versione di Riferimento: Modifiche incrementali rispetto alla v1.55 (basata sui file iniziali forniti).
1. Modifiche Funzionali Implementate con Successo:
•	1.1. Randomizzazione della Diteggiatura Iniziale nel Glossario Accordi (UI):
o	Obiettivo: Variare la diteggiatura iniziale mostrata per ciascun accordo nel glossario dell'interfaccia utente, invece di visualizzare sempre la prima disponibile.
o	Modifiche Apportate: 
	Nel file main/app-ui-render.js, la funzione renderSongOutput, durante la creazione dell'oggetto window.glossaryChordData per ogni accordo, ora seleziona un currentShapeIndex casuale dall'array shapes dell'accordo.
	La visualizzazione HTML del glossario utilizza questo currentShapeIndex randomizzato per mostrare la diteggiatura iniziale.
o	Stato: Implementato e funzionante nell'interfaccia utente.
•	1.2. Visualizzazione Avanzata della Timeline Sezioni (UI):
o	Obiettivo: Mostrare informazioni più dettagliate all'interno di ogni card della sezione nella timeline, specificamente il "Ritmo Armonico Dettagliato" sotto forma di "slash notation", e assicurare che le card si adattino in altezza per visualizzare tutto il contenuto.
o	Modifiche Apportate: 
	JavaScript (main/app-ui-render.js): 
	La funzione renderSongOutput è stata modificata per generare, per ogni card della sezione, una nuova struttura HTML che include etichette separate per "Chords:" (accordi base) e "Rhythm:" (slash notation).
	È stata aggiunta la logica per iterare sulle battute di ogni sezione e sui detailedHarmonicEvents per costruire la rappresentazione in slash notation (es. | Em / / C |).
	CSS (style/components.css - basato su OLDFUNZIONANTEcomponents.css): 
	Per .timeline-section-card, è stata impostata height: auto; (e min-height appropriata) per permettere alle card di espandersi verticalmente in base al loro contenuto.
	È stato impostato align-items: stretch; per il contenitore .song-sections-timeline per far sì che tutte le card tendano ad avere la stessa altezza (quella della più alta) mantenendo la visibilità completa del contenuto.
	Sono stati aggiunti nuovi stili per .section-card-chords-base, .section-card-rhythm-label, e .section-card-rhythm-display per formattare correttamente le nuove informazioni.
	L'interlinea per .section-card-rhythm-display è stata leggermente aumentata (es. line-height: 1.45;) per migliorare la leggibilità.
o	Stato: Implementato e funzionante. Le card della timeline ora mostrano la slash notation e si adattano in altezza, con tutte le card che assumono l'altezza della più alta.
2. Problemi Risolti Durante lo Sviluppo:
•	Diversi ReferenceError e SyntaxError in vari file JavaScript sono stati identificati e corretti, tra cui: 
o	Errori di ordine di caricamento degli script in index.html.
o	Errori di ridichiarazione della variabile currentMidiData (risolto assicurando una singola dichiarazione let in main/app-song-generation.js e rimuovendo let/const dalle altre occorrenze).
o	Errori di passaggio di parametri a funzioni (es. in generateBassLineForSong.js e downloadSingleTrackMidi in app-midi-export.js).
•	Il problema che impediva la generazione dei file MIDI (ReferenceError: url is not defined in app-midi-export.js) è stato risolto.
3. Problemi Attualmente Non Risolti o Persistenti:
•	3.1. Scarsità di Note nelle Linee di Basso:
o	Descrizione: Nonostante i tentativi di rendere più "aggressiva" la logica di riempimento in generateBassLineForSong.js, le linee di basso generate presentano ancora significativi vuoti e mancano di densità.
o	Stato: Non Risolto. Le modifiche apportate non hanno prodotto il miglioramento desiderato.
•	3.2. Scarsità di Note nelle Linee Vocali:
o	Descrizione: Simile al basso, ci si aspetta che le linee vocali generate da generateVocalLineForSong.js (file non direttamente analizzato per il suo contenuto ma per i suoi profili in lib/vocal_profiles.js) possano soffrire di eccessivi silenzi.
o	Stato: Non Affrontato in modo approfondito. Le strategie di intervento proposte (modifica dei profili o della logica del generatore) non sono state ancora implementate.
•	3.3. RISOLTO: Mancata Corrispondenza Diteggiature tra UI e File di Testo:
o	Descrizione: Il file di testo generato dalla funzione buildSongDataForTextFile (in main/app-midi-export.js) continua a mostrare la prima diteggiatura ("Pos 1") per ogni accordo nel glossario, invece di riflettere la diteggiatura scelta casualmente e visualizzata correttamente nell'interfaccia utente.
o	Causa Probabile: Problema di timing o di accesso/disponibilità dei dati randomizzati in window.glossaryChordData al momento dell'esecuzione di buildSongDataForTextFile. La logica di fallback a CHORD_LIB (che contiene solo la prima diteggiatura come default) viene probabilmente attivata.
o	Stato: Non Risolto. Le modifiche per rendere renderSongOutput e generateSongArchitecture asincrone e per attendere il completamento del caricamento del glossario prima di abilitare i pulsanti (inclusa la modifica per leggere l'indice randomizzato) non hanno ancora sortito l'effetto desiderato sul file di testo.
•	3.4. Qualità Sonora "Generate Chord Rhythm":
o	Descrizione: (Problema ereditato dalla v1.55) L'output della traccia "Chords Rhythm" può risultare confuso.
o	Stato: Non Affrontato.
4. Considerazioni Finali:
Sono state implementate con successo le modifiche richieste per la randomizzazione delle diteggiature nell'UI e per la visualizzazione migliorata della timeline. Diversi errori critici di JavaScript che impedivano il funzionamento sono stati risolti.
Tuttavia, i problemi principali relativi alla densità delle linee di basso e alla sincronizzazione delle diteggiature nel file di testo rimangono aree che necessitano di ulteriore intervento. Anche la qualità della linea vocale e del "Chord Rhythm" sono punti aperti per futuri miglioramenti.


Report Tecnico CapricEngine v1.55
Data Stesura: 31 Maggio 2025 Versione Applicazione di Riferimento: v1.55
1. Introduzione
•	1.1. Scopo del Documento Il presente documento fornisce un'analisi tecnica dettagliata dell'applicazione web CapricEngine v1.55. L'obiettivo è descrivere l'architettura, le funzionalità chiave, lo stato attuale di sviluppo, i problemi noti e le strutture dati fondamentali. Questo report è inteso come una guida per sviluppatori e intelligenze artificiali che necessitano di comprendere e lavorare sul codice dell'applicazione.
•	1.2. Panoramica di CapricEngine e Obiettivi Core CapricEngine è un'applicazione web front-end, con componenti server-side PHP, progettata per la generazione semi-aleatoria di architetture musicali. L'obiettivo primario è fornire ai musicisti uno "scheletro" creativo, aiutando a superare il blocco compositivo iniziale. L'utente definisce parametri come umore, sensazione ritmica, metro e tonalità per generare strutture di canzoni, progressioni armoniche, informazioni musicali dettagliate, un glossario visuale degli accordi (con diteggiature caricate dinamicamente) e la possibilità di esportare varie parti strumentali in formato MIDI Tipo 0. Ogni brano è nominato "Phalbo Caprice n. X", con X gestito lato server.
•	1.3. Stack Tecnologico Generale 
o	Frontend: HTML5, CSS3, JavaScript (ECMAScript standard).
o	Backend: PHP per la gestione del contatore dei brani e per servire i dati delle diteggiature degli accordi.
o	Librerie Esterne: midiwriter.js (v3.1.1) per la generazione di file MIDI.
o	Database Accordi: Un file JSON (Chords.txt) contenente un vasto database di accordi e diteggiature.
2. Architettura dell'Applicazione
•	2.1. Struttura delle Cartelle e dei File Principali L'applicazione è organizzata in modo modulare:
o	/ (Root): 
	index.html: Entry point dell'applicazione web.
	style/: Contiene i fogli di stile suddivisi. 
	core-layout.css: Reset, variabili CSS globali, stili di base per HTML, tipografia generale, media query di base.
	components.css: Stili per componenti specifici (form, pulsanti, timeline, glossario, ecc.).
	theme-visuals.css: Stili puramente estetici, animazioni, stili per logo e diagrammi SVG.
	get_chord_data.php: Script PHP per recuperare dati degli accordi da lib/chord-db/Chords.txt.
	counter.php: Script PHP per la gestione del contatore dei brani.
	caprice_count.txt: File di testo per il contatore.
	CapricEngine_LogoW.svg: Logo dell'applicazione.
o	lib/: Librerie, moduli di configurazione, helper teorici e renderer. 
	midiwriter.js: Libreria MIDI esterna.
	config-music-data.js: Costanti musicali (scale, qualità accordi, strutture, TPQN, ecc.).
	theory-helpers.js: Funzioni di utilità per la teoria musicale (es. getChordRootAndType, getDiatonicChords, normalizeChordNameToSharps).
	harmonic-patterns-config.js: Definisce SECTION_HARMONIC_RHYTHM_PATTERNS.
	passing-chords-config.js: Definisce PASSING_CHORD_RULES.
	vocal_profiles.js: Contiene VOCAL_STYLE_PROFILES.
	chord-renderer.js: Gestione accordi (CHORD_LIB, fetchChordVoicings, rendering diagrammi).
	scale-renderer.js: Rendering diagrammi scale.
	drum-patterns-library.js: Pattern di batteria, fill, mappatura MIDI.
	chord-rhythm-generator.js: Logica e pattern per generateChordRhythmEvents.
	chord-db/Chords.txt: Database JSON delle diteggiature degli accordi.
o	gen/: Generatori specifici per tracce strumentali/vocali. 
	melody-generator.js, generateBassLineForSong.js, generateVocalLineForSong.js, generateDrumTrackForSong.js. Tutti "time signature aware" e adattati a mainChordSlots.
o	main/: Moduli JavaScript principali per l'orchestrazione. 
	app-setup.js: Inizializzazione, UI dinamica, event listener principali.
	app-song-generation.js: Logica core di generazione canzone (struttura, armonia base, arrangiamento ritmico-armonico).
	app-ui-render.js: Rendering output nell'HTML, caricamento on-demand diteggiature.
	app-midi-export.js: Esportazione MIDI e testo.
•	2.2. Componenti Server-Side (PHP)
o	2.2.1. counter.php 
	Gestisce un contatore numerico progressivo per i "Phalbo Caprice".
	Legge e scrive sul file caprice_count.txt, utilizzando il blocco del file (flock) per prevenire race conditions.
	Restituisce il numero successivo in formato JSON.
o	2.2.2. get_chord_data.php 
	Funge da endpoint API per fornire dati sulle diteggiature degli accordi.
	Riceve i parametri GET key (radice) e suffix (tipo di accordo).
	Legge il file lib/chord-db/Chords.txt.
	Cerca l'accordo richiesto e restituisce un array JSON di oggetti diteggiatura (contenenti frets e fingerings) o un array vuoto se non trovato.
	Gestisce errori HTTP appropriati.
•	2.3. Componenti Client-Side (HTML, CSS, JavaScript)
o	2.3.1. index.html 
	Struttura base della pagina con aree per input (#songParamsForm), output (#songOutputContainer, #songOutput), e pulsanti di azione (#actionButtonsContainer).
	Include tutti gli script JS necessari nell'ordine corretto.
o	2.3.2. Fogli di Stile (style/) 
	core-layout.css: Reset, variabili globali CSS (:root per colori, spazi, font, variabili per timeline, colori sezioni e pulsanti), stili base HTML e tipografia.
	components.css: Stili per componenti UI specifici: form, pulsante "Generate", info canzone, timeline, glossario accordi, pulsanti MIDI. L'ID del pulsante per "Chords Rhythm" è stato corretto in button#generateChordsRhythmMidiButton per coerenza con app-setup.js.
	theme-visuals.css: Stili estetici, animazione sfondo, logo, testo loading, colori interni diagrammi SVG.
o	2.3.3. Moduli JavaScript Fondamentali (lib/) 
	config-music-data.js: Contiene costanti e dati musicali statici (TICKS_PER_QUARTER_NOTE_REFERENCE, NOTE_NAMES, allNotesWithFlats, QUALITY_DEFS, scales, MOOD_SONG_STRUCTURES, SECTION_DURATION_GUIDELINES, SECTION_CHORD_TARGETS, TIME_SIGNATURES_BY_MOOD, bpmRanges, moodToStyleNotes).
	theory-helpers.js: Funzioni di utilità per teoria musicale (es. getChordRootAndType, getDiatonicChords, normalizeChordNameToSharps, getChordNotes, getScaleNotesText, getRandomElement).
	harmonic-patterns-config.js: Definisce SECTION_HARMONIC_RHYTHM_PATTERNS.
	passing-chords-config.js: Definisce PASSING_CHORD_RULES.
	vocal_profiles.js: Contiene VOCAL_STYLE_PROFILES per generateVocalLineForSong.js.
	chord-renderer.js: Costruisce CHORD_LIB, gestisce fetchChordVoicings per caricare dati da get_chord_data.php, parsa stringhe di fret (parseExternalFretString), e renderizza diagrammi SVG per chitarra e piano. Non aggiunge più "Forma Base (Theoretical)" come fallback prioritario se dati esterni sono disponibili.
	scale-renderer.js: Genera SVG per diagrammi di scale (chitarra e piano), con corretta gestione dei bemolle.
	drum-patterns-library.js: Definisce DRUM_MAP_DRUMS_LIB, buildDrumPatternPool, generateDrumFillEvents.
	chord-rhythm-generator.js: Contiene CHORD_RHYTHM_PATTERNS e generateChordRhythmEvents per ritmi di accordi.
o	2.3.4. Moduli Generatori di Tracce (gen/) 
	Ciascun file (melody-generator.js, generateBassLineForSong.js, generateVocalLineForSong.js, generateDrumTrackForSong.js) genera gli eventi MIDI per la rispettiva traccia, tenendo conto del time signature della sezione e utilizzando mainChordSlots.
o	2.3.5. Moduli Principali di Orchestrazione (main/) 
	app-setup.js: Inizializza l'UI, popola i dropdown, crea pulsanti di azione e aggancia listener a "Generate". Definisce window.attachActionListenersGlobal.
	app-song-generation.js: Contiene generateSongArchitecture (logica principale di generazione canzone, inclusa la Fase 1a del ritmo armonico), generateChordsForSection, e recalculateTimeSignatureChangesAndSectionTicks. Include helpers come getCleanSectionName e normalizeChordNameToSharps.
	app-ui-render.js: Contiene renderSongOutput per aggiornare il DOM con i risultati della canzone, gestisce il caricamento on-demand delle diteggiature per il glossario, e la navigazione tap/swipe nel glossario.
	app-midi-export.js: Contiene downloadSingleTrackMidi per l'esportazione MIDI Tipo 0 e gli handlers per tutti i pulsanti di esportazione e salvataggio testo (buildSongDataForTextFile, handleSaveSong).
•	2.4. Flusso Dati Principale (Generazione Canzone -> Rendering UI -> Esportazione)
o	L'utente imposta i parametri in index.html e clicca "Generate".
o	app-setup.js cattura l'evento e chiama generateSongArchitecture() (in main/app-song-generation.js).
o	generateSongArchitecture(): 
	Recupera input, determina tonalità, BPM, struttura canzone, time signature (potenzialmente variabili).
	Genera baseChords per ogni sezione tramite generateChordsForSection().
	Esegue la fase di "Arrangiamento Ritmico-Armonico": 
	Applica SECTION_HARMONIC_RHYTHM_PATTERNS ai baseChords.
	Popola section.detailedHarmonicEvents (con startTickInSection, durationTicks, isPassing, isHit).
	Popola section.mainChordSlots (con effectiveStartTickInSection, effectiveDurationTicks).
	Salva tutti i dati in currentMidiData.
	Chiama renderSongOutput().
o	renderSongOutput() (in main/app-ui-render.js): 
	Visualizza informazioni generali, timeline sezioni (basata su section.baseChords per ora), diagramma scala.
	Per il glossario accordi: 
	Itera sugli accordi unici usati.
	Se le diteggiature non sono caricate (areVoicingsLoaded è false), chiama fetchChordVoicings().
o	fetchChordVoicings() (in lib/chord-renderer.js): 
	Effettua una chiamata fetch a get_chord_data.php.
o	get_chord_data.php (server-side): 
	Legge Chords.txt, trova l'accordo, restituisce le diteggiature come JSON.
o	fetchChordVoicings() (JS): Riceve i dati, li passa a renderSongOutput.
o	renderSongOutput() (JS): 
	Parsa le diteggiature (parseExternalFretString).
	Aggiorna CHORD_LIB[accordo].shapes e glossaryChordData.
	Renderizza i diagrammi chitarra/piano e il <select> per le diteggiature.
o	generateSongArchitecture() abilita i pulsanti di esportazione.
o	L'utente clicca un pulsante di esportazione (es. "Chords Rhythm").
o	app-setup.js (tramite attachActionListenersGlobal) indirizza l'evento all'handler appropriato in main/app-midi-export.js (es. handleGenerateChordRhythm).
o	L'handler: 
	Chiama il generatore specifico (es. generateChordRhythmEvents in lib/chord-rhythm-generator.js, che usa mainChordSlots se il contesto è fornito da handleGenerateChordRhythm).
	Prepara i dati MIDI e chiama downloadSingleTrackMidi() per creare e scaricare il file.
3. Funzionalità Chiave e Implementazione
•	3.1. Input Utente e Parametri di Generazione 
o	L'UI (index.html) permette la selezione di Mood, Tempo Feeling, Meter (Time Signature), e Tonalità.
o	app-song-generation.js legge questi valori per guidare il processo.
•	3.2. Generazione Struttura Canzone 
o	Basata su MOOD_SONG_STRUCTURES (in config-music-data.js), che mappa un "mood" a un array di possibili sequenze di sezioni.
o	La durata di ogni sezione è determinata da SECTION_DURATION_GUIDELINES.
o	Il numero di accordi per sezione è influenzato da SECTION_CHORD_TARGETS.
•	3.3. Gestione Time Signature (Globale e per Sezione) 
o	L'utente può forzare un time signature globale.
o	Altrimenti, il TS iniziale è scelto da TIME_SIGNATURES_BY_MOOD.
o	Cambi di TS tra sezioni sono possibili, basati su probabilità e transizioni definite in TIME_SIGNATURES_BY_MOOD.
o	currentMidiData.timeSignatureChanges traccia questi cambiamenti con i rispettivi tick.
o	recalculateTimeSignatureChangesAndSectionTicks() assicura la coerenza dei tick.
•	3.4. Implementazione Ritmo Armonico (Fase 1a) 
o	3.4.1. SECTION_HARMONIC_RHYTHM_PATTERNS: Definiti in lib/harmonic-patterns-config.js, specificano per ogni time signature e tipo di sezione (intro, verse, ecc.) una lista pesata di pattern ritmici. Ogni pattern definisce una sequenza di eventi armonici con degree (es. "FROM_CHOSEN_PATTERN", "NEXT_FROM_CHOSEN_PATTERN", "PASSING", "HIT") e durationBeats.
o	3.4.2. "Arrangiamento Ritmico-Armonico" in app-song-generation.js (generateSongArchitecture): 
	Itera sulle battute di ogni sezione della baseProgression (generata da generateChordsForSection).
	Seleziona casualmente (basato su weight) un pattern da SECTION_HARMONIC_RHYTHM_PATTERNS appropriato per il TS e il tipo di sezione.
	Applica il pattern selezionato per determinare la durata e il tipo di ogni evento armonico all'interno della battuta.
o	3.4.3. Strutture Dati: 
	section.detailedHarmonicEvents: Array popolato con oggetti { chordName, startTickInSection, durationTicks, isPassing, isHit, baseChordIndexAffiliation }. isPassing e isHit sono marcatori basati sul degree del pattern applicato; la logica specifica per generare accordi di passaggio unici o "hit" distintivi è pianificata per la Fase 1b.
	section.mainChordSlots: Array popolato con oggetti { chordName, effectiveStartTickInSection, effectiveDurationTicks, originalBaseChordIndex }. Definisce lo "spazio temporale" effettivo per ogni accordo della baseProgression, derivato aggregando i detailedHarmonicEvents.
o	3.4.4. Adattamento Generatori di Tracce: I moduli in gen/ (melodia, basso, voce) sono stati modificati per leggere section.mainChordSlots e basare la generazione delle frasi e la gestione delle durate sulla effectiveDurationTicks di ciascun slot, per una migliore sincronia con l'armonia.
•	3.5. Generazione Tracce Specifiche 
o	3.5.1. Accordi (Pad e Rhythm): 
	"Chords (Pad)" (handleGenerateSingleTrackChordMidi): Genera accordi MIDI tenuti basati sugli eventi principali (non "PASSING" o "HIT") in detailedHarmonicEvents, rispettandone le durate.
	"Chords Rhythm" (handleGenerateChordRhythm): Itera su detailedHarmonicEvents; per ogni evento principale, chiama generateChordRhythmEvents (da lib/chord-rhythm-generator.js) con un slotContext. Include logica di post-processing per ridurre le sovrapposizioni. generateChordRhythmEvents applica i CHORD_RHYTHM_PATTERNS per riempire lo slot.
o	3.5.2. Melodia (melody-generator.js): Utilizza mainChordSlots e i parametri in MELODY_GENERATION_PARAMS per generare una linea melodica, considerando le note della scala principale e le note dell'accordo corrente.
o	3.5.3. Linea di Basso (generateBassLineForSong.js): Adattato per usare mainChordSlots. La funzione interna applyRhythmicPatternToSlot riceve la durata dello slot e adatta i pattern di basso.
o	3.5.4. Linea Vocale (generateVocalLineForSong.js): Utilizza mainChordSlots e i VOCAL_STYLE_PROFILES (da lib/vocal_profiles.js) per generare linee vocali stilisticamente variate.
o	3.5.5. Batteria (generateDrumTrackForSong.js): 
	Utilizza buildDrumPatternPool e generateDrumFillEvents da lib/drum-patterns-library.js.
	Il problema TypeError: variation.apply is not a function è stato risolto assicurando che la clonazione del pattern preservi le funzioni apply.
	Implementa "Awareness": logica per reagire ai mainChordSlots, con probabilità di inserire crash o variare il pattern (es. hi-hat/ride) all'inizio di un nuovo slot armonico principale che coincide con l'inizio di una misura.
•	3.6. Esportazione MIDI (Tipo 0) e Testo Canzone 
o	main/app-midi-export.js gestisce le esportazioni.
o	downloadSingleTrackMidi: Funzione centrale per l'esportazione MIDI Tipo 0. Include ProgramChangeEvent (omesso per la batteria), TempoEvent, TrackNameEvent, e un singolo TimeSignatureEvent iniziale.
o	buildSongDataForTextFile: Genera un file di testo con dettagli della canzone, inclusi "Accordi Principali" (baseChords) e il nuovo "Ritmo Armonico Dettagliato (per battuta)" (da detailedHarmonicEvents).
•	3.7. Visualizzazione Interfaccia Utente 
o	3.7.1. Song Info e Timeline Sezioni: 
	Renderizzate da renderSongOutput in main/app-ui-render.js.
	La timeline (.song-sections-timeline) mostra card per ogni sezione (.timeline-section-card).
	Colori e larghezza delle card sono dinamici, basati su variabili CSS (per i colori, es. --section-color-intro da core-layout.css) e calcoli JS (per la larghezza, usando --bar-unit-width e --min-section-bar-display da core-layout.css).
	La timeline UI mostra ancora solo i section.baseChords per semplicità, non i detailedHarmonicEvents.
o	3.7.2. Glossario Accordi (Caricamento on-demand, Navigazione): 
	app-ui-render.js gestisce la creazione di placeholder "Loading...", il caricamento asincrono delle diteggiature tramite fetchChordVoicings (che chiama get_chord_data.php), l'aggiornamento di CHORD_LIB e glossaryChordData, e il rendering dei diagrammi e del selettore di diteggiature.
	Include logica per la navigazione tra diteggiature tramite tap/swipe e pulsanti freccia, con aggiornamento dell'indicatore di posizione (.shape-position-indicator).
o	3.7.3. Diagrammi Scala: Renderizzati da lib/scale-renderer.js.
4. Stato Attuale dell'Applicazione (v1.55)
•	4.1. Funzionalità Completate e Operative 
o	Generazione struttura canzone base e progressioni accordi principali.
o	Implementazione Fase 1a del Ritmo Armonico: detailedHarmonicEvents e mainChordSlots sono generati e usati.
o	Generatori di Melodia, Basso, Voce, Pad e Chords Rhythm adattati a mainChordSlots.
o	Esportazione MIDI Tipo 0 per tutte le tracce generate.
o	Esportazione testuale dei dettagli canzone, inclusa la nuova struttura ritmico-armonica.
o	Rendering UI con timeline sezioni (colori dinamici, larghezza), glossario accordi con caricamento on-demand da Chords.txt via PHP, e diagrammi scala.
o	Navigazione diteggiature nel glossario (frecce, tap, swipe).
o	Generatore di Batteria: Il problema TypeError: variation.apply is not a function è stato risolto. La batteria include la funzionalità "Awareness" ai cambi di accordo principali.
•	4.2. Problemi Noti e Impatto: 
o	4.2.1. Scarsità di Note e Errori Linea di Basso: 
	Problema: La linea di basso presenta ancora significativi spazi vuoti e occasionalmente fallisce la generazione ("Impossibile generare una linea di basso con i dati attuali.").
	Causa Probabile: La logica di applyRhythmicPatternToSlot in generateBassLineForSong.js potrebbe essere troppo conservativa nel riempire i mainChordSlots o avere condizioni di uscita dal loop troppo restrittive. selectBassNote potrebbe non trovare note valide in rari casi. Condizioni iniziali (es. scala vuota dopo filtraggio per range) potrebbero portare a un output nullo.
	Impatto: Linee di basso frammentate, poco incisive o assenti.
o	4.2.2. Scarsità di Note Linea Vocale: 
	Problema: Similmente al basso, la linea vocale presenta troppi silenzi.
	Causa Probabile: La logica in generateVocalLineForSong.js che interpreta i VOCAL_STYLE_PROFILES (specialmente getStyledNoteDurationAndRest e le rest_rules) potrebbe favorire eccessivamente le pause (pause_skip) o generare sequenze di note troppo corte rispetto ai mainChordSlots. Il loop di generazione per slot potrebbe terminare prematuramente.
	Impatto: Linee vocali discontinue e poco presenti.
o	4.2.3. Qualità Sonora "Generate Chord Rhythm": 
	Problema: L'output può risultare confuso ("marmellata sonora") nonostante la logica di anti-sovrapposizione.
	Causa Probabile: Densità intrinseca dei CHORD_RHYTHM_PATTERNS (in lib/chord-rhythm-generator.js). La logica di anti-sovrapposizione in handleGenerateChordRhythm (in app-midi-export.js) potrebbe necessitare di ulteriori affinamenti (es. priorità vocale, troncamento più musicale).
	Impatto: Traccia "Chords Rhythm" non sempre musicalmente gradevole.
o	4.2.4. Visualizzazione Timeline UI e detailedHarmonicEvents: 
	Stato: La timeline UI mostra ancora solo i section.baseChords.
	Discrepanza: Non riflette la nuova granularità ritmico-armonica dei detailedHarmonicEvents.
	Impatto: L'utente non ha un riscontro visivo immediato della complessità ritmica introdotta.
•	4.3. Fase 1b (Passing/Hit Chords) - Pianificata, Non Attiva 
o	La gestione specifica dei degree: "PASSING" (utilizzando PASSING_CHORD_RULES) e degree: "HIT" all'interno dei SECTION_HARMONIC_RHYTHM_PATTERNS non è ancora implementata in app-song-generation.js.
5. Strutture Dati Chiave
•	currentMidiData (globale in app-song-generation.js, usata da molti moduli): Oggetto centrale contenente tutti i dati della canzone generata (titolo, BPM, timeSignatureChanges, keySignatureRoot, keyModeName, fullKeyName, capriceNum, totalMeasures, mainScaleNotes, e soprattutto sections che a loro volta contengono name, baseChords, measures, timeSignature, startTick, detailedHarmonicEvents, mainChordSlots).
•	CHORD_LIB (globale in lib/chord-renderer.js): Dizionario con nomi accordo normalizzati come chiavi. Ogni valore è un oggetto con name, notes, quality, guitarFrets (default visualizzato), pianoNotes, e l'array shapes. 
o	shapes: Array di oggetti { shapeKey, displayName, guitarFrets }.
o	areVoicingsLoaded: Flag booleano per il caricamento on-demand da Chords.txt.
•	glossaryChordData (globale o nello scope di app-ui-render.js): Sottoinsieme di CHORD_LIB per gli accordi usati nella canzone corrente, con currentShapeKey per la diteggiatura visualizzata.
•	SECTION_HARMONIC_RHYTHM_PATTERNS (da lib/harmonic-patterns-config.js): Struttura dati che definisce pattern ritmici per l'armonia basati su time signature e tipo di sezione.
•	PASSING_CHORD_RULES (da lib/passing-chords-config.js): Regole per generare accordi di passaggio (per Fase 1b).
•	VOCAL_STYLE_PROFILES (da lib/vocal_profiles.js): Definizioni per stili vocali diversi.
•	CHORD_RHYTHM_PATTERNS (da lib/chord-rhythm-generator.js): Pattern per la generazione ritmica degli accordi in generateChordRhythmEvents.
•	Costanti Globali da config-music-data.js: TICKS_PER_QUARTER_NOTE_REFERENCE, NOTE_NAMES, QUALITY_DEFS, scales, MOOD_SONG_STRUCTURES, ecc..
6. Dipendenze Principali
•	6.1. Esterne: 
o	lib/midiwriter.js.
•	6.2. Interne: 
o	I moduli main/* dipendono fortemente dalle funzioni e dati in lib/* e gen/*.
o	main/app-ui-render.js dipende da lib/chord-renderer.js (fetchChordVoicings, parseExternalFretString) per il caricamento on-demand delle diteggiature.
o	I generatori in gen/* dipendono da currentMidiData e dalle funzioni helper di teoria musicale.
o	Molti moduli accedono a configurazioni globali da lib/config-music-data.js e a CHORD_LIB.
7. Considerazioni per Sviluppo Futuro e Assistenza AI
•	7.1. Priorità per la Risoluzione dei Problemi Noti: 
o	Densità Basso/Voce: Indagare applyRhythmicPatternToSlot in generateBassLineForSong.js e la logica di getStyledNoteDurationAndRest in generateVocalLineForSong.js per migliorare il riempimento degli slot e ridurre i silenzi eccessivi. Potrebbe essere necessario rendere più "generosi" i pattern o meno probabili le pause.
o	Qualità "Chord Rhythm": Rivedere i CHORD_RHYTHM_PATTERNS per ridurne la densità o migliorare la logica di anti-sovrapposizione in handleGenerateChordRhythm (es. priorità alle note fondamentali o gestione più musicale del troncamento).
o	Visualizzazione Timeline UI: Modificare renderSongOutput in app-ui-render.js per visualizzare i detailedHarmonicEvents nelle "song section card" invece dei soli baseChords, per dare un feedback visivo più accurato del ritmo armonico generato.
•	7.2. Implementazione Fase 1b: 
o	Attivare la logica in app-song-generation.js (durante l'Arrangiamento Ritmico-Armonico) per gestire specificamente i degree: "PASSING" (utilizzando PASSING_CHORD_RULES da lib/passing-chords-config.js) e degree: "HIT". Questo implica che quando un pattern armonico indica "PASSING", generateSongArchitecture dovrebbe consultare PASSING_CHORD_RULES per selezionare un accordo di passaggio appropriato basato sul contesto (accordo precedente, successivo, tonalità).
•	7.3. Possibili Miglioramenti e Refactoring: 
o	Database Accordi (Chords.txt): Valutare se il formato attuale e il metodo di accesso tramite PHP sono ottimali per performance a lungo termine se il DB cresce significativamente. Per ora, con ~300KB, è gestibile.
o	Gestione Errori PHP: Migliorare ulteriormente l'error handling e il logging negli script PHP.
o	Interfaccia Utente: Oltre alla timeline, considerare altri miglioramenti per la visualizzazione e l'interazione.
o	Configurabilità Pattern: Esporre più parametri dei generatori (es. MELODY_GENERATION_PARAMS, densità batteria, ecc.) all'utente tramite l'UI.
•	7.4. Aree che Richiedono Ulteriore Documentazione o Chiarimenti: 
o	La logica interna di getFriendGeneratedCommonVoicings() in lib/chord-renderer.js dovrebbe essere ben documentata una volta che l'utente la popola, per capire quali diteggiature "amico" sono disponibili come fallback.
o	Le interazioni precise e le priorità tra CHORD_LIB (forme "amico"), QUALITY_DEFS.base (se riattivate), e i dati da Chords.txt nel popolare l'array shapes di un accordo dovrebbero essere chiaramente definite per evitare confusioni. Attualmente, sembra che Chords.txt sovrascriva/prevalga se fornisce dati.
•	7.5. Guida per l'AI: Quali file/moduli sono rilevanti per modificare/estendere specifiche funzionalità. 
o	Aggiungere/Modificare Strutture Canzone o Regole Tonalità/Tempo: lib/config-music-data.js (specificamente MOOD_SONG_STRUCTURES, SECTION_DURATION_GUIDELINES, SECTION_CHORD_TARGETS, TIME_SIGNATURES_BY_MOOD, bpmRanges).
o	Modificare Generazione Armonia Base: main/app-song-generation.js (funzione generateChordsForSection).
o	Modificare Logica Ritmo Armonico (Fase 1a e futura 1b): main/app-song-generation.js (fase "Arrangiamento Ritmico-Armonico" in generateSongArchitecture), lib/harmonic-patterns-config.js, lib/passing-chords-config.js.
o	Modificare Generazione Melodia/Basso/Voce: Rispettivi file in gen/ (es. gen/melody-generator.js). Per la voce, anche lib/vocal_profiles.js.
o	Modificare Generazione Batteria: gen/generateDrumTrackForSong.js e lib/drum-patterns-library.js (per pattern e fill).
o	Modificare Esportazione MIDI/Testo: main/app-midi-export.js.
o	Modificare UI (Rendering Output, Glossario): main/app-ui-render.js e i file CSS in style/.
o	Modificare Gestione Diteggiature Accordi: lib/chord-renderer.js (per la logica client-side) e get_chord_data.php (per la logica server-side di accesso a Chords.txt). Il file lib/chord-db/Chords.txt stesso per aggiungere/modificare diteggiature.
o	Aggiungere Nuovi Stili Visivi: style/theme-visuals.css o style/components.css.

# CapricEngine
