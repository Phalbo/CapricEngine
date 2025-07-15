# CapricEngine

CapricEngine is a web-based application that procedurally generates musical compositions. It allows users to select a mood, tempo, and key, and then generates a complete song structure with chords, a bassline, a melody, and a drum track. The application is built with HTML, CSS, and JavaScript, and uses the `midiwriter.js` library to export the generated music as MIDI files.

## Architecture

The application is divided into several modules, each responsible for a specific part of the song generation process.

### Core Modules

*   **`main/app-song-generation.js`**: This is the main module that orchestrates the song generation process. It defines the song structure, generates the chord progression, and creates the `mainChordSlots` that are used by the other generators.
*   **`main/app-midi-export.js`**: This module handles the creation and download of MIDI files for each track. It contains functions to generate the MIDI events for the chords, bassline, melody, and drums.
*   **`main/app-ui-render.js`**: This module is responsible for rendering the generated song data in the user interface. It displays the song structure, chords, and other information.
*   **`main/app-setup.js`**: This module initializes the application, sets up the user interface, and attaches event listeners to the various controls.

### Generator Modules


*   **`gen/generateBassLineForSong.js`**: This module generates the bassline for the song. It uses a sophisticated algorithm to create a bassline that is both rhythmically and harmonically interesting.
*   **`gen/bass-pitch-selector.js`**: This module contains the logic for selecting the pitches for the bassline. It uses a weighted random selection process to choose notes that are harmonically appropriate and create a smooth bassline.
*   **`gen/melody-generator.js`**: This module generates the melody for the song.
*   **`gen/generateVocalLineForSong.js`**: This module generates a vocal line for the song.
*   **`gen/generateDrumTrackForSong.js`**: This module generates the drum track for the song.

### Library Modules

*   **`lib/theory-helpers.js`**: This module contains a collection of helper functions for performing music theory calculations, such as getting the notes of a chord or a scale.
*   **`lib/config-music-data.js`**: This module contains the configuration data for the application, such as the available moods, tempos, and keys.
*   **`lib/midiwriter.js`**: This is an external library that is used to create the MIDI files.

## Song Generation Process

The song generation process is initiated when the user clicks the "Generate" button. The following steps are performed:

1.  The `generateSongArchitecture` function in `main/app-song-generation.js` is called.
2.  The song structure is determined based on the selected mood and other parameters.
3.  A chord progression is generated for each section of the song.
4.  The `mainChordSlots` are created, which are time-based slots that contain a single chord.
5.  The `renderSongOutput` function in `main/app-ui-render.js` is called to display the generated song data in the user interface.
6.  The user can then click the buttons for the individual tracks to generate and download the MIDI files. Each of these buttons calls a handler function in `main/app-midi-export.js`, which in turn calls the appropriate generator function.

I am confident that this report accurately reflects the current state of the application. I will now commit the fix for the bug.

