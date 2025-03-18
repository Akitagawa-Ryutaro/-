document.addEventListener("DOMContentLoaded", function () {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let chordSequence = [];
    let selectedBlocks = [];
    let isEditing = false;
    let isPlaying = false;

    // 初期化: ローカルストレージからロード
    loadSequence();

    document.getElementById('add-chord-block').addEventListener('click', () => openModal());

    document.getElementById('play-sequence').addEventListener('click', () => {
        if (!isPlaying) playChordSequence();
    });

    document.getElementById('stop-sequence').addEventListener('click', stopChordSequence);

    document.getElementById('reset-sequence').addEventListener('click', resetSequence);

    document.getElementById('edit-mode-toggle').addEventListener('click', toggleEditMode);

    document.getElementById('close-modal').addEventListener('click', closeModal);

    document.getElementById('save-chord').addEventListener('click', saveChord);

    document.getElementById('save-sequence').addEventListener('click', saveSequence);

    document.getElementById('load-sequence').addEventListener('click', loadSequence);

    document.getElementById('copy-blocks').addEventListener('click', copyBlocks);

    document.getElementById('paste-blocks').addEventListener('click', pasteBlocks);

    function openModal(chord = 'C', measures = 1, index = null) {
        if (typeof chord !== 'string') chord = 'C'; // 万が一のデフォルト

        const rootNoteMatch = chord.match(/[A-G](#|b)?/);
        const rest = chord.slice((rootNoteMatch || [''])[0].length);
        const chordTypeMatch = rest.match(/(mM7|M7|m7|M|m|7|dim|aug|sus[24]|dim7|7b5|7b9|7#9|m7b5|6\/9|9|m9|M9|6|m6|13|m13|M13|11|m11|M11|m\(add9\)|add9)?(\/[A-G](#|b)?)?/);
        const chordType = (chordTypeMatch ? chordTypeMatch[1] : '');
        const slashBass = (chordTypeMatch ? chordTypeMatch[2] : '');

        document.getElementById('modal-root-note').value = rootNoteMatch ? rootNoteMatch[0][0] : 'C';
        document.getElementById('modal-accidental').value = rootNoteMatch ? rootNoteMatch[0].slice(1) : '';
        document.getElementById('modal-chord-type').value = chordType;
        document.getElementById('modal-slash-bass').value = slashBass === '' ? '' : slashBass;
        document.getElementById('modal-measures-input').value = measures || '';
        document.getElementById('modal').style.display = 'flex';
        document.getElementById('save-chord').dataset.index = index ?? chordSequence.length;
    }

    function closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    function saveChord() {
        const root = document.getElementById('modal-root-note').value;
        const accidental = document.getElementById('modal-accidental').value;
        const chordType = document.getElementById('modal-chord-type').value;
        const slashBass = document.getElementById('modal-slash-bass').value;
        const measures = parseInt(document.getElementById('modal-measures-input').value, 10);
        const fullChord = root + accidental + chordType + slashBass;

        if (fullChord && measures > 0) {
            addOrUpdateChord(fullChord, measures);
            closeModal();
        }
    }

    function resetSequence() {
        chordSequence = [];
        selectedBlocks = [];
        renderChordSequence();
    }

    function toggleEditMode() {
        isEditing = !isEditing;
        document.getElementById('edit-mode-toggle').textContent = isEditing ? '再生モード' : '編集モード';
        renderChordSequence();
    }

    function addOrUpdateChord(chord, measures) {
        const index = parseInt(document.getElementById('save-chord').dataset.index);
        chordSequence[index] = { chord, measures };
        renderChordSequence();
    }

    function renderChordSequence() {
        const sequenceContainer = document.getElementById('chord-sequence');
        sequenceContainer.innerHTML = '';
        chordSequence.forEach(({ chord, measures }, index) => {
            const chordBlock = document.createElement('div');
            chordBlock.textContent = `${chord.replaceAll('b', '♭')} (${measures}拍)`;
            chordBlock.className = 'chord-block';
            chordBlock.style.padding = '10px';
            chordBlock.style.border = '1px solid #000';
            chordBlock.style.margin = '5px';
            chordBlock.style.cursor = 'pointer';

            chordBlock.addEventListener('click', () => {
                if (isEditing) {
                    if (selectedBlocks.includes(index)) {
                        selectedBlocks = selectedBlocks.filter(e => e !== index);
                        chordBlock.classList.remove('selected');
                    } else {
                        selectedBlocks.push(index);
                        chordBlock.classList.add('selected');
                    }
                }
            });

            if (!isEditing) {
                chordBlock.addEventListener('dblclick', () => playChordSequence(index));
            } else {
                chordBlock.addEventListener('dblclick', () => openModal(chord, measures, index));
            }

            sequenceContainer.appendChild(chordBlock);
        });
    }

    function playChordSequence(startIndex = 0) {
        isPlaying = true;
        let currentTime = audioContext.currentTime;
        const bpm = parseInt(document.getElementById('bpm-input').value, 10) || 120;

        for (let i = startIndex; i < chordSequence.length; i++) {
            const { chord, measures } = chordSequence[i];
            const secondsPerBeat = 60 / bpm;
            
            for (let beat = 0; beat < measures; beat++) {
                scheduleChord(chord, currentTime, secondsPerBeat, i);
                currentTime += secondsPerBeat;
            }
        }

        setTimeout(() => { isPlaying = false; }, (currentTime - audioContext.currentTime) * 1000);
    }

    function stopChordSequence() {
        isPlaying = false;
        audioContext.suspend();
        audioContext.resume(); // 音再生のための再開
    }

    function scheduleChord(chordString, startTime, duration, index) {
        if (!isPlaying) return;

        setTimeout(() => {
            highlightBlock(index);
            playChord(chordString, duration);
            setTimeout(() => removeHighlight(index), duration * 1000);
        }, (startTime - audioContext.currentTime) * 1000);
    }

    function highlightBlock(index) {
        const blocks = document.querySelectorAll('.chord-block');
        blocks.forEach((block, i) => {
            if (i === index) {
                block.classList.add('active');
            }
        });
    }

    function removeHighlight(index) {
        const blocks = document.querySelectorAll('.chord-block');
        blocks[index].classList.remove('active');
    }

    function playChord(chordString, duration) {
        const rootNoteMatch = chordString.match(/[A-G](#|b)?/);
        const chordTypeMatch = chordString.match(/(mM7|M7|m7|M|m|7|dim|aug|sus[24]|dim7|7b5|7b9|7#9|m7b5|6\/9|9|m9|M9|6|m6|13|m13|M13|11|m11|M11|m\(add9\)|add9)/);

        if (!rootNoteMatch || !chordTypeMatch) {
            console.error("未対応のコード：" + chordString);
            return;
        }

        const rootNote = rootNoteMatch[0];
        const chordType = chordTypeMatch[0];
        const frequencyList = calculateChordFrequencies(rootNote, chordType);

        frequencyList.forEach(frequency => {
            playPianoLikeFrequency(frequency, duration);
            highlightKey(frequency);
        });
    }

    function calculateChordFrequencies(rootNote, chordType) {
        const intervals = {
            'M': [0, 4, 7],
            'm': [0, 3, 7],
            '7': [0, 4, 7, 10],
            'm7': [0, 3, 7, 10],
            'M7': [0, 4, 7, 11],
            'mM7': [0, 3, 7, 11],
            'dim': [0, 3, 6],
            'dim7': [0, 3, 6, 9],
            'aug': [0, 4, 8],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            '7sus4': [0, 5, 7, 10],
            '6': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],
            '9': [0, 4, 7, 10, 14],
            'm9': [0, 3, 7, 10, 14],
            'M9': [0, 4, 7, 11, 14],
            'm(add9)': [0, 3, 7, 14],
            'add9': [0, 4, 7, 14],
            '11': [0, 4, 7, 10, 14, 17],
            'm11': [0, 3, 7, 10, 14, 17],
            'M11': [0, 4, 7, 11, 14, 17],
            '13': [0, 4, 7, 10, 14, 17, 21],
            'm13': [0, 3, 7, 10, 14, 17, 21],
            'M13': [0, 4, 7, 11, 14, 17, 21],
            '6/9': [0, 4, 7, 9, 14],
            '5': [0, 7],
            '7b5': [0, 4, 6, 10],
            '7b9': [0, 4, 7, 10, 13],
            '7#9': [0, 4, 7, 10, 15],
            'm7b5': [0, 3, 6, 10],
        };

        const rootFrequency = getFrequency(rootNote);

        return intervals[chordType].map(interval => rootFrequency * Math.pow(2, interval / 12));
    }

    function getFrequency(note) {
        const noteFrequencyMap = {
            'C': 261.63,
            'C#': 277.18,
            'Db': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'Eb': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'Gb': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'Ab': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'Bb': 466.16,
            'B': 493.88,
            'C2': 523.25,
            'C#2': 554.37,
            'Db2': 554.37,
            'D2': 587.33,
            'D#2': 622.25,
            'Eb2': 622.25,
            'E2': 659.25,
            'F2': 698.46,
            'F#2': 739.99,
            'Gb2': 739.99,
            'G2': 783.99,
            'G#2': 830.61,
            'Ab2': 830.61,
            'A2': 880.00,
            'A#2': 932.33,
            'Bb2': 932.33,
            'B2': 987.77
        };
        return noteFrequencyMap[note];
    }

    function playPianoLikeFrequency(frequency, duration) {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const lowpass = audioContext.createBiquadFilter();

        oscillator1.type = 'triangle';
        oscillator2.type = 'square';
        oscillator1.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(frequency, audioContext.currentTime);

        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(3000, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);

        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration+0.5);

        oscillator1.connect(gainNode).connect(lowpass).connect(audioContext.destination);
        oscillator2.connect(gainNode);

        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(audioContext.currentTime + duration+0.5);
        oscillator2.stop(audioContext.currentTime + duration+0.5);
    }

    function highlightKey(frequency) {
        const note = getNoteByFrequency(frequency);
        const keyElement = document.querySelector(`.key[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
            setTimeout(() => keyElement.classList.remove('active'), 500);
        }
    }

    function getNoteByFrequency(frequency) {
        const closestNote = Object.entries({
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88,
            'C2': 523.25,
            'C#2': 554.37,
            'Db2': 554.37,
            'D2': 587.33,
            'D#2': 622.25,
            'Eb2': 622.25,
            'E2': 659.25,
            'F2': 698.46,
            'F#2': 739.99,
            'G2': 783.99,
            'G#2': 830.61,
            'Ab2': 830.61,
            'A2': 880.00,
            'A#2': 932.33,
            'Bb2': 932.33,
            'B2': 987.77,
            'C-below': 130.81,
            'C#-below': 138.59,
            'D-below': 146.83,
            'D#-below': 155.56,
            'E-below': 164.81,
            'F-below': 174.61,
            'F#-below': 185.00,
            'G-below': 196.00,
            'G#-below': 207.65,
            'A-below': 220.00,
            'A#-below': 233.08,
            'B-below': 246.94
        }).reduce((closest, [note, freq]) => {
            return Math.abs(freq - frequency) < Math.abs(closest.freq - frequency) ? { note, freq } : closest;
        }, { note: '', freq: Infinity });

        return closestNote.note;
    }

    function saveSequence() {
        localStorage.setItem('chordSequence', JSON.stringify(chordSequence));
    }

    function loadSequence() {
        let loadedSequence = JSON.parse(localStorage.getItem('chordSequence'));
        if (Array.isArray(loadedSequence)) {
            chordSequence = loadedSequence;
            renderChordSequence();
        }
    }

    function copyBlocks() {
        selectedBlocks.sort((a, b) => a - b);
        let copiedBlocks = selectedBlocks.map(index => chordSequence[index]);
        localStorage.setItem('copiedBlocks', JSON.stringify(copiedBlocks));
    }

    function pasteBlocks() {
        let copiedBlocks = JSON.parse(localStorage.getItem('copiedBlocks'));
        if (Array.isArray(copiedBlocks)) {
            chordSequence = chordSequence.concat(copiedBlocks);
            renderChordSequence();
        }
    }
});