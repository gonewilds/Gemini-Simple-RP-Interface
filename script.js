//11.03.02
document.addEventListener('DOMContentLoaded', function () {
    (async () => {
        const characterListDiv = document.getElementById('characterList');
        const addCharacterButton = document.getElementById('addCharacterButton');
        const importCharacterButton = document.getElementById('importCharacterButton');
        const exportCharacterButton = document.getElementById('exportCharacterButton');
        const exportCharacterModal = document.getElementById('exportCharacterModal')
        const characterFormModal = document.getElementById('characterFormModal');
        const editCharacterModal = document.getElementById('editCharacterModal');
        const importCharacterModal = document.getElementById('importCharacterModal');
        const characterForm = document.getElementById('characterForm');
        const editCharacterForm = document.getElementById('editCharacterForm');
        const editProfilePicInput = document.getElementById('editProfilePic');
        const profilePicInput = document.getElementById('profilePic');
        const editIndexInput = document.getElementById('editIndex');
        const characterSelect = document.getElementById('characterSelect');
        const confirmExportButton = document.getElementById('confirmExport');
        const lorebookInput = document.getElementById('lorebook');
        const editLorebookInput = document.getElementById('editLorebook');


        const DB_NAME = "character_ai_db";
        const DB_VERSION = 1;
        const CHARACTERS_STORE = "characters";

        let db;

        // Function to generate a 6-digit random ID
        function generateCharacterId() {
            return Math.floor(100000 + Math.random() * 900000);
        }

        function initIndexedDB() {
            return new Promise((resolve, reject) => {
                const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                request.onerror = (event) => {
                    console.error("Failed to open IndexedDB database", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }
                request.onsuccess = (event) => {
                    db = event.target.result;
                    console.log("IndexedDB database opened successfully")
                    resolve();
                }
                request.onupgradeneeded = (event) => {
                    db = event.target.result;
                    const objectStore = db.createObjectStore(CHARACTERS_STORE, { keyPath: 'id' }); //removed autoincrement
                    console.log("IndexedDB database created successfully")
                    resolve();
                }

            })
        }
        async function getCharactersFromDB() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.getAll();

                request.onerror = (event) => {
                    console.error("Failed to get charachters from DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                }
            })

        }

        async function saveCharacterToDB(character) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.add(character);
                request.onerror = (event) => {
                    console.error("Failed to save charachter to DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }
                request.onsuccess = () => {
                    resolve();
                }
            })
        }
        async function updateCharacterToDB(character) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.put(character);
                request.onerror = (event) => {
                    console.error("Failed to update charachter to DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }
                request.onsuccess = () => {
                    resolve();
                }
            })
        }


        async function deleteCharacterFromDB(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.delete(id);

                request.onerror = (event) => {
                    console.error("Failed to delete character from DB", event);
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                };

                request.onsuccess = () => {
                    resolve();
                };
            });
        }


        async function renderCharacters() {
            characterListDiv.innerHTML = '';
            characterSelect.innerHTML = '';
            const characters = await getCharactersFromDB();
            characters.forEach((character, index) => {
                const card = document.createElement('div');
                card.classList.add('chat-card');
                const img = document.createElement('img');
                if (character.profilePic) {
                    img.src = character.profilePic;
                } else {
                    img.src = 'https://placehold.co/50x50/grey/white?text=' + character.name[0]
                }
                img.alt = `${character.name} Profile Picture`;
                card.appendChild(img);
                const textContent = document.createElement('div');
                textContent.classList.add('text-content');
                const name = document.createElement('div');
                name.classList.add('name');
                name.textContent = character.name;
                const preview = document.createElement('div');
                preview.classList.add('preview');
                const previewText = character.greeting || 'No greeting';
                preview.textContent = previewText.length > 20 ? previewText.substring(0, 40) + "..." : previewText;
                textContent.appendChild(name);
                textContent.appendChild(preview);
                card.appendChild(textContent);
                const actionButtons = document.createElement('div')
                actionButtons.classList.add('action-buttons');
                const editButton = document.createElement('button')
                editButton.classList.add('edit-button')
                editButton.innerHTML = `<i class="fas fa-edit"></i>`
                editButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    populateEditModal(character.id);
                    editCharacterModal.style.display = 'block';
                    addCharacterButton.style.display = 'none';
                })
                const deleteButton = document.createElement('button')
                deleteButton.classList.add('delete-button')
                deleteButton.innerHTML = `<i class="fas fa-trash-alt"></i>`
                deleteButton.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    const characterId = character.id;
                    await deleteCharacterFromDB(characterId);

                    // Delete chat history from local storage
                    localStorage.removeItem(`chat-history-${characterId}`);

                    renderCharacters();
                });
                actionButtons.appendChild(editButton)
                actionButtons.appendChild(deleteButton)
                card.appendChild(actionButtons)

                card.addEventListener('click', () => {
                    window.location.href = `rp-room.html?character=${character.id}`;
                });
                characterListDiv.appendChild(card);

                const option = document.createElement('option');
                option.value = character.id;
                option.text = character.name;
                characterSelect.appendChild(option)
            });
        }


        async function saveCharacter(character) {
            await saveCharacterToDB(character);
            renderCharacters();
        }

        async function updateCharacter(character) {
            await updateCharacterToDB(character)
            renderCharacters();
        }

        async function deleteCharacter(id) {
            await deleteCharacterFromDB(id);
            renderCharacters();
        }


        function downloadCharacter(index) {
            return new Promise(async (resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.get(parseInt(index));
                request.onerror = (event) => {
                    console.error("Failed to get charachter from DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }
                request.onsuccess = (event) => {
                    const character = event.target.result;
                    const filename = `${character.name.replace(/\s+/g, '_').toLowerCase()}.json`;
                    const json = JSON.stringify(character, null, 2);

                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve();
                }
            })
        }
        addCharacterButton.addEventListener('click', () => {
            characterFormModal.style.display = 'block';
            addCharacterButton.style.display = 'none';
        });
        exportCharacterButton.addEventListener('click', () => {
            exportCharacterModal.style.display = 'block';
        });
        importCharacterButton.addEventListener('click', () => {
            importCharacterModal.style.display = 'block';
        });

        async function populateEditModal(characterId) {
            const lorebookList = document.getElementById('lorebookList');
            lorebookList.innerHTML = ''; // Clear existing list items

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.get(characterId);
                request.onerror = (event) => {
                    console.error("Failed to get charachter from DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }
                request.onsuccess = (event) => {
                    const character = event.target.result;
                    document.getElementById('editName').value = character.name;
                    document.getElementById('editPersonality').value = character.personality;
                    document.getElementById('editScenario').value = character.scenario;
                    document.getElementById('editGreeting').value = character.greeting;
                    editIndexInput.value = characterId; // Store the actual ID
                    //Display the lorebook here
                     if (character.lorebooks && character.lorebooks.length > 0) {
                            character.lorebooks.forEach((lorebook, index) => {
                                const listItem = document.createElement('li');
                                // Get the file name from the lorebook object (assuming it has a 'name' property)
                                // Or, if it is saved as string then just put the index
                                let filename = typeof lorebook === 'string' ? `Lorebook ${index+1}` : lorebook.name || `Lorebook ${index + 1}`;  // default name to avoid error
                                listItem.textContent = `${index + 1}. ${filename}`;
                                lorebookList.appendChild(listItem);
                            });
                        }else{
                           const listItem = document.createElement('li');
                           listItem.textContent = 'No lorebooks attached.';
                           lorebookList.appendChild(listItem);
                        }
                    resolve();
                }
            })


        }

        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                characterFormModal.style.display = 'none';
                addCharacterButton.style.display = 'flex';
                importCharacterModal.style.display = 'none';
                editCharacterModal.style.display = 'none';
                exportCharacterModal.style.display = 'none';
                addCharacterButton.style.display = 'flex';
            });
        });


        window.addEventListener('click', (event) => {
            if (event.target === characterFormModal) {
                characterFormModal.style.display = 'none';
                addCharacterButton.style.display = 'flex';
            }
            if (event.target === importCharacterModal) {
                importCharacterModal.style.display = 'none';
            }
            if (event.target === editCharacterModal) {
                editCharacterModal.style.display = 'none';
                addCharacterButton.style.display = 'flex';
            }
            if (event.target === exportCharacterModal) {
                exportCharacterModal.style.display = 'none';
            }
        });
        confirmExportButton.addEventListener('click', async () => {
            const selectedIndex = characterSelect.value
            await downloadCharacter(selectedIndex);
            exportCharacterModal.style.display = 'none';
        });


        async function readLorebookFiles(files) {
            const lorebooks = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const fileContent = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target.result);
                        reader.onerror = (error) => reject(error);
                        reader.readAsText(file);
                    });

                    // Attempt to parse as JSON, but handle potential parsing errors
                    try {
                        const lorebookObj = JSON.parse(fileContent);
                        lorebookObj.name = file.name; //save the file name
                        lorebooks.push(lorebookObj);
                    } catch (jsonError) {
                        console.warn(`Could not parse ${file.name} as JSON:`, jsonError);
                        // If parsing fails, store the content as a string (or handle it differently)
                        lorebooks.push(fileContent);
                    }
                } catch (readError) {
                    console.error(`Error reading file ${file.name}:`, readError);
                }
            }
            return lorebooks;
        }

        characterForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const file = profilePicInput.files[0];
            const lorebookFiles = lorebookInput.files; // Get the lorebook files
            let newCharacter;
            const characterId = generateCharacterId();
            const lorebooks = await readLorebookFiles(lorebookFiles)

            if (file) {
                const reader = new FileReader();
                reader.onload = async function (e) {
                    newCharacter = {
                        id: characterId,
                        name: document.getElementById('name').value,
                        personality: document.getElementById('personality').value,
                        scenario: document.getElementById('scenario').value,
                        greeting: document.getElementById('greeting').value,
                        profilePic: e.target.result,
                        lorebooks: lorebooks // Add lorebooks to character object
                    }
                    await saveCharacter(newCharacter)
                    characterFormModal.style.display = 'none';
                    characterForm.reset();
                }
                reader.readAsDataURL(file)
            } else {
                newCharacter = {
                    id: characterId,
                    name: document.getElementById('name').value,
                    personality: document.getElementById('personality').value,
                    scenario: document.getElementById('scenario').value,
                    greeting: document.getElementById('greeting').value,
                    profilePic: 'https://placehold.co/50x50/grey/white?text=' + document.getElementById('name').value[0],
                    lorebooks: lorebooks // Add lorebooks to character object
                }
                await saveCharacter(newCharacter)
                characterFormModal.style.display = 'none';
                characterForm.reset();
            }
        });

        editCharacterForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const characterId = parseInt(editIndexInput.value) //retrieve the original id
            const file = editProfilePicInput.files[0];
            const lorebookFiles = editLorebookInput.files;
            let updatedCharacter;
            const lorebooks = await readLorebookFiles(lorebookFiles)

            if (file) {
                const reader = new FileReader();
                reader.onload = async function (e) {
                    updatedCharacter = {
                        id: characterId, //Use the original id
                        name: document.getElementById('editName').value,
                        personality: document.getElementById('editPersonality').value,
                        scenario: document.getElementById('editScenario').value,
                        greeting: document.getElementById('editGreeting').value,
                        profilePic: e.target.result,
                        lorebooks: lorebooks
                    }
                    await updateCharacter(updatedCharacter)
                    editCharacterModal.style.display = 'none';
                    editCharacterForm.reset();
                     location.reload();

                }
                reader.readAsDataURL(file)

            } else {
                const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.get(characterId);
                request.onerror = (event) => {
                    console.error("Failed to get charachter from DB", event)
                }
                request.onsuccess = async (event) => {
                    const character = event.target.result;
                    updatedCharacter = {
                        id: characterId,  //Use the original id
                        name: document.getElementById('editName').value,
                        personality: document.getElementById('editPersonality').value,
                        scenario: document.getElementById('editScenario').value,
                        greeting: document.getElementById('editGreeting').value,
                        profilePic: character.profilePic,
                        lorebooks: lorebooks.length > 0 ? lorebooks : character.lorebooks //if new lorebook added use this, else use the old lorebook
                    }
                    await updateCharacter(updatedCharacter)
                    editCharacterModal.style.display = 'none';
                    editCharacterForm.reset();
                      location.reload();
                }
            }
        });
        function base64ToArrayBuffer(base64) {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        function extractCharacterDataFromPng(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async function (event) {
                    try {
                        const arrayBuffer = base64ToArrayBuffer(event.target.result.split(',')[1]);
                        const metadata = await parsePngMetadata(arrayBuffer)
                        if (metadata && metadata.tEXt && metadata.tEXt) {
                            let base64Data = metadata.tEXt;
                            const base64StartIndex = base64Data.indexOf('eyJ');
                            if (base64StartIndex !== -1) {
                                base64Data = base64Data.substring(base64StartIndex);
                                const characterData = JSON.parse(atob(base64Data));
                                const characterId = generateCharacterId(); //Generate a new character id
                                const character = {
                                    id: characterId,
                                    name: characterData.data.name,
                                    personality: (characterData.data.personality || "") + "\n" + (characterData.data.description || ""),
                                    scenario: characterData.data.scenario,
                                    greeting: characterData.data.first_mes,
                                    profilePic: event.target.result,
                                    lorebooks: [] //no lorebook when importing from png
                                }
                                resolve(character)

                            } else {
                                reject("no base64 data")
                            }

                        } else {
                            reject("no chara data")
                        }
                    } catch (error) {
                        reject("failed to parse data " + error)
                    }
                }
                reader.onerror = () => reject("failed to read file")
                reader.readAsDataURL(file)
            })
        }
        function parsePngMetadata(buffer) {
            return new Promise((resolve, reject) => {
                metadata.parse(buffer, (err, metadata) => {
                    if (err) {
                        reject(err)
                        return;
                    }
                    resolve(metadata)
                });
            })
        }
        document.getElementById('fileInput').addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith("image/")) {
                    try {
                        const character = await extractCharacterDataFromPng(file)
                        await saveCharacter(character)
                        importCharacterModal.style.display = 'none';
                    } catch (error) {
                        console.error(error)
                        importCharacterModal.style.display = 'none';
                    }

                } else {
                    const reader = new FileReader();
                    reader.onload = async function (event) {
                        try {
                            const importedCharacter = JSON.parse(event.target.result)
                            if (Array.isArray(importedCharacter)) {
                                for (const char of importedCharacter) {
                                    // Generate a new ID for each character
                                    const characterId = generateCharacterId();
                                    const characterWithId = { ...char, id: characterId, lorebooks: [] };
                                    await saveCharacter(characterWithId);
                                }
                            } else {
                                const characterId = generateCharacterId();
                                const characterWithId = { ...importedCharacter, id: characterId, lorebooks: [] };
                                await saveCharacter(characterWithId);
                            }
                        } catch (e) {
                            console.error('failed to import file')
                        }
                        importCharacterModal.style.display = 'none';
                    }
                    reader.readAsText(file)
                }
            }
        });

        await initIndexedDB();
        renderCharacters();
    })();
});