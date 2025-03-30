// Function to save settings to localStorage
function saveSettings() {
    const darkModeEnabled = document.getElementById('darkModeToggle').checked;
    const soundEnabled = document.getElementById('soundToggle').checked;
    const musicEnabled = document.getElementById('musicToggle').checked;
    const volumeLevel = document.getElementById('volumeSlider').value;

    // Save settings in localStorage
    localStorage.setItem('darkMode', darkModeEnabled);
    localStorage.setItem('sound', soundEnabled);
    localStorage.setItem('music', musicEnabled);
    localStorage.setItem('volume', volumeLevel);

    // Apply changes to the page
    applySettings();
}

// Function to apply saved settings
function applySettings() {
    // Retrieve settings from localStorage
    const darkMode = JSON.parse(localStorage.getItem('darkMode')) || false;
    const sound = JSON.parse(localStorage.getItem('sound')) || true;
    const music = JSON.parse(localStorage.getItem('music')) || true;
    const volume = localStorage.getItem('volume') || 50;

    // Apply dark mode
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('darkModeToggle').checked = false;
    }

    // Apply sound and music preferences
    document.getElementById('soundToggle').checked = sound;
    document.getElementById('musicToggle').checked = music;
    document.getElementById('volumeSlider').value = volume;

    // Update audio settings (if needed)
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.volume = volume / 100;
        if (sound) {
            audio.muted = false;
        } else {
            audio.muted = true;
        }
    });
}

// Event listeners for toggle and slider inputs
document.getElementById('darkModeToggle').addEventListener('change', saveSettings);
document.getElementById('soundToggle').addEventListener('change', saveSettings);
document.getElementById('musicToggle').addEventListener('change', saveSettings);
document.getElementById('volumeSlider').addEventListener('input', saveSettings);

// Load settings when the page loads
window.addEventListener('load', applySettings);
