const previewText = document.getElementById('previewText');
const fontUpload = document.getElementById('fontUpload');
const uploadArea = document.getElementById('uploadArea');
const customFonts = document.getElementById('customFonts');
const noCustomFonts = document.getElementById('noCustomFonts');
const applyFont = document.getElementById('applyFont');
const resetFont = document.getElementById('resetFont');
const builtinFontSelect = document.getElementById('builtinFontSelect');

let selectedFont = 'default';
let selectedFontType = 'builtin'; // 'builtin' or 'custom'
// no font-size state

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadCustomFonts();
    setupEventListeners();
    updatePreview();
});

async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['selectedFont', 'selectedFontType']);
        
        if (result.selectedFont) {
            selectedFont = result.selectedFont;
        }
        
        if (result.selectedFontType) {
            selectedFontType = result.selectedFontType;
        }
        
        // no font size in UI anymore
        
        // Update UI to reflect loaded settings
        updateFontSelection();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function updateFontSelection() {
    // Sync dropdown value
    if (selectedFontType === 'builtin' && builtinFontSelect) {
        builtinFontSelect.value = selectedFont;
    }
    // For custom items, highlight the selected card if it exists
    document.querySelectorAll('.custom-font-item').forEach(el => {
        if (el.dataset.customFont === selectedFont && selectedFontType === 'custom') {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function setupEventListeners() {
    // Font upload
    uploadArea.addEventListener('click', () => {
        fontUpload.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    });
    
    fontUpload.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
    
    // Built-in font selection (dropdown)
    builtinFontSelect.addEventListener('change', (e) => {
        selectedFont = e.target.value;
        selectedFontType = 'builtin';
        updateFontSelection();
        updatePreview();
    });
    

    // Action buttons
    applyFont.addEventListener('click', applyFontSettings);
    resetFont.addEventListener('click', resetToDefault);
}

async function handleFileUpload(files) {
    const validTypes = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2'];
    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    
    for (const file of files) {
        // Check file type
        const isValidType = validTypes.includes(file.type) || 
                           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidType) {
            alert(`Invalid file type: ${file.name}. Please upload TTF, OTF, WOFF, or WOFF2 files.`);
            continue;
        }
        
        try {
            await saveCustomFont(file);
        } catch (error) {
            console.error('Error uploading font:', error);
            alert(`Error uploading ${file.name}: ${error.message}`);
        }
    }
    
    // Clear the input
    fontUpload.value = '';
    
    // Reload custom fonts display
    await loadCustomFonts();
}

async function saveCustomFont(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const fontData = e.target.result;
                const fontName = file.name.split('.')[0];
                const fontId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Get existing custom fonts
                const result = await chrome.storage.local.get(['customFonts']);
                const customFonts = result.customFonts || {};
                
                // Add new font
                customFonts[fontId] = {
                    name: fontName,
                    originalName: file.name,
                    data: fontData,
                    type: file.type,
                    id: fontId,
                    uploadDate: new Date().toISOString()
                };
                
                // Save to storage
                await chrome.storage.local.set({ customFonts });
                
                resolve(fontId);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

async function loadCustomFonts() {
    try {
        const result = await chrome.storage.local.get(['customFonts']);
        const customFontData = result.customFonts || {};
        
        // Clear existing custom fonts display
        customFonts.innerHTML = '';
        
        const fontIds = Object.keys(customFontData);
        
        if (fontIds.length === 0) {
            customFonts.appendChild(noCustomFonts);
            return;
        }
        
        // Create font items
        fontIds.forEach(fontId => {
            const fontInfo = customFontData[fontId];
            const fontItem = createCustomFontItem(fontInfo);
            customFonts.appendChild(fontItem);
        });
        
    } catch (error) {
        console.error('Error loading custom fonts:', error);
    }
}

function createCustomFontItem(fontInfo) {
    const item = document.createElement('div');
    item.className = 'custom-font-item font-option';
    item.dataset.customFont = fontInfo.id;

    item.innerHTML = `
        <span class="custom-font-name">${fontInfo.name}</span>
        <div class="custom-font-actions">
            <button class="btn-small btn-use" data-font-id="${fontInfo.id}">Use</button>
            <button class="btn-small btn-delete" data-font-id="${fontInfo.id}">Delete</button>
        </div>
    `;

    return item;
}

function selectCustomFont(fontId) {
    selectedFont = fontId;
    selectedFontType = 'custom';
    updateFontSelection();
    updatePreview();
}

async function deleteCustomFont(fontId) {
    if (!confirm('Are you sure you want to delete this font?')) {
        return;
    }

    try {
        const result = await chrome.storage.local.get(['customFonts']);
        const customFonts = result.customFonts || {};

        delete customFonts[fontId];

        await chrome.storage.local.set({ customFonts });

        // If the deleted font was selected, reset to default
        if (selectedFont === fontId) {
            selectedFont = 'default';
            selectedFontType = 'builtin';
            updateFontSelection();
            updatePreview();
        }

        // Reload custom fonts display
        await loadCustomFonts();

    } catch (error) {
        console.error('Error deleting font:', error);
        alert('Error deleting font. Please try again.');
    }
}

customFonts.addEventListener('click', async (e) => {
    const useBtn = e.target.closest('.btn-use');
    const delBtn = e.target.closest('.btn-delete');
    if (useBtn && customFonts.contains(useBtn)) {
        const fontId = useBtn.getAttribute('data-font-id');
        selectCustomFont(fontId);
    } else if (delBtn && customFonts.contains(delBtn)) {
        const fontId = delBtn.getAttribute('data-font-id');
        await deleteCustomFont(fontId);
    }
});

async function updatePreview() {
    if (selectedFontType === 'builtin') {
        if (selectedFont === 'default') {
            previewText.style.fontFamily = '';
        } else {
            previewText.style.fontFamily = selectedFont;
        }
    } else if (selectedFontType === 'custom') {
        try {
            const result = await chrome.storage.local.get(['customFonts']);
            const customFontData = result.customFonts || {};
            const fontInfo = customFontData[selectedFont];
            
            if (fontInfo) {
                // Create a font face and apply it
                const fontFace = new FontFace(fontInfo.name, `url(${fontInfo.data})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                previewText.style.fontFamily = `"${fontInfo.name}", sans-serif`;
            }
        } catch (error) {
            console.error('Error loading custom font for preview:', error);
        }
    }
    
    // keep X default font-size
}

async function applyFontSettings() {
    try {
        // Save settings
        await chrome.storage.sync.set({ selectedFont, selectedFontType });
        
        // Send message to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url.includes('x.com')) {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'applyFont',
                font: selectedFont,
                fontType: selectedFontType
            });
        }
        
        // Show success feedback
        const originalText = applyFont.textContent;
        applyFont.textContent = '✓ Applied!';
        applyFont.style.background = '#28a745';
        
        setTimeout(() => {
            applyFont.textContent = originalText;
            applyFont.style.background = '';
        }, 1500);
        
    } catch (error) {
        console.error('Error applying font:', error);
        alert('Error applying font. Please try again.');
    }
}

async function resetToDefault() {
    selectedFont = 'default';
    selectedFontType = 'builtin';
    updateFontSelection();
    updatePreview();
    
    await applyFontSettings();
}
