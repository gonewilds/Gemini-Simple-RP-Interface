//13.02
import * as metadata from './png-metadata-browser.js';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, DynamicRetrievalMode } from '@google/generative-ai';

document.addEventListener('DOMContentLoaded', function () {
    (async () => {
        const messageArea = document.getElementById('messageArea');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const settingsButton = document.getElementById('settingsButton');
        const settingsModal = document.getElementById('settingsModal');
        const apiKeyModal = document.getElementById('apiKeyModal');
        const generationModal = document.getElementById('generationModal');
        const editCharacterModal = document.getElementById('editCharacterModal');
        const settingsDropdown = document.getElementById('settingsDropdown')
        const apiKeySettingButton = document.getElementById('apiKeySettingButton');
        const generationSettingButton = document.getElementById('generationSettingButton');
        const newChatButton = document.getElementById('newChatButton');
        const characterEditorButton = document.getElementById('characterEditorButton');
        const regenerateButton = document.getElementById('regenerateButton');
        const editCharacterForm = document.getElementById('editCharacterForm');
        const editProfilePicInput = document.getElementById('editProfilePic');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const maxTokenInput = document.getElementById('maxTokenInput');
        const editIndexInput = document.getElementById('editIndex');
        const temperatureInput = document.getElementById('temperatureInput');
        const temperatureValue = document.getElementById('temperatureValue');
        const presencePenaltyInput = document.getElementById('presencePenaltyInput');
        const presencePenaltyValue = document.getElementById('presencePenaltyValue');
        const frequencyPenaltyInput = document.getElementById('frequencyPenaltyInput');
        const frequencyPenaltyValue = document.getElementById('frequencyPenaltyValue');
        const topPInput = document.getElementById('topPInput');
        const topPValue = document.getElementById('topPValue');
        const topKInput = document.getElementById('topKInput');
        const customInstructionsInput = document.getElementById('customInstructions');
        const customImpersonateInstructionsInput = document.getElementById('customImpersonateInstructions');
        const applyButton = document.getElementById('applyButton');
        const uploadButton = document.getElementById('uploadButton');
        const uploadBadge = document.getElementById('uploadBadge');
        const closeModalButtons = document.querySelectorAll('.close-modal');
        const chatProfilePic = document.getElementById('chatProfilePic')
        const chatName = document.getElementById('chatName')
        const saveChatButton = document.getElementById('saveChatButton');
        const loadChatButton = document.getElementById('loadChatButton');
        const impersonateButton = document.getElementById('ImpersonateButton');
        let currentCharacter = null;
        let messages = [];
        let chatHistory = [];
        let chatModel = null;
        const urlParams = new URLSearchParams(window.location.search);
        const characterIndex = urlParams.get('character');
        const DB_NAME = "character_ai_db";
        const DB_VERSION = 1;
        const CHARACTERS_STORE = "characters";
        let db;
        let uploadedImage = null;
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF }
        ];
        let generationConfig = {
            stopSequences: [],
            maxOutputTokens: 300,
            temperature: 1,
            topP: 0.95,
            topK: 40,
            presencePenalty: 0.5,
            frequencyPenalty: 0.7
        };

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
                    const objectStore = db.createObjectStore(CHARACTERS_STORE, { keyPath: 'id' });
                    console.log("IndexedDB database created successfully")
                    resolve();
                }

            })
        }
        async function getCharacterFromDB(index) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.get(parseInt(index));

                request.onerror = (event) => {
                    console.error("Failed to get charachter from DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                }
            })

        }
        async function updateCharacterToDB(character) {  //Remove Index here
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
                const objectStore = transaction.objectStore(CHARACTERS_STORE);
                const request = objectStore.put(character);  //No id here
                request.onerror = (event) => {
                    console.error("Failed to update charachter to DB", event)
                    reject(`IndexedDB Error: ${event.target.errorCode}`);
                }
                request.onsuccess = () => {
                    resolve();
                }
            })
        }
         function saveChatHistory(){
            if(currentCharacter && messages.length > 0){
                const key = `chat-history-${currentCharacter.id}`;
                localStorage.setItem(key,JSON.stringify(messages));
            }
         }
        function loadChatHistory(){
            if(currentCharacter){
                const key = `chat-history-${currentCharacter.id}`;
              const storedHistory = localStorage.getItem(key)
              if(storedHistory){
                  messages = JSON.parse(storedHistory);
                  messages.forEach(msg =>{
                       displayMessage(msg.sender, msg.text, msg.image);
                  })
              }
            }
        }
        async function loadCurrentCharacter() {
            if (characterIndex) {
                currentCharacter = await getCharacterFromDB(characterIndex)
                if (currentCharacter) {
                    chatName.textContent = currentCharacter.name
                    if (currentCharacter.profilePic) {
                        chatProfilePic.src = currentCharacter.profilePic
                    } else {
                        chatProfilePic.src = 'https://placehold.co/50x50/grey/white?text=' + currentCharacter.name[0]
                    }
                    const genConfig = localStorage.getItem('generationConfig')
                    if (genConfig) {
                        generationConfig = JSON.parse(genConfig)
                        maxTokenInput.value = generationConfig.maxOutputTokens;
                        temperatureInput.value = generationConfig.temperature;
                        temperatureValue.textContent = generationConfig.temperature
                        presencePenaltyInput.value = generationConfig.presencePenalty
                        presencePenaltyValue.textContent = generationConfig.presencePenalty;
                        frequencyPenaltyInput.value = generationConfig.frequencyPenalty;
                        frequencyPenaltyValue.textContent = generationConfig.frequencyPenalty;
                        topPInput.value = generationConfig.topP;
                        topPValue.textContent = generationConfig.topP;
                        topKInput.value = generationConfig.topK;
                        customInstructionsInput.value = localStorage.getItem('customInstructions');
                        customImpersonateInstructionsInput.value = localStorage.getItem('customImpersonateInstructions') || "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Don't write as {{char}} or system. Don't describe actions of {{char}}. ]"

                    }
                    loadChatHistory();
                     initializeChatModel(currentCharacter)
                }
            }
        }
         function displayMessage(sender, text, image) {
           let messageElement = null;
           if(image){
                messageElement = document.createElement('div');
                messageElement.classList.add('message');
               if (sender === 'user') {
                    messageElement.classList.add('user-message');
                } else {
                    messageElement.classList.add('bot-message');
                }
                const messageContentDiv = document.createElement('div');
                 messageContentDiv.innerHTML = '';
                  const imgElement = document.createElement('img');
               imgElement.src = `data:${image.mimeType};base64,${image.data}`;
               imgElement.style.maxWidth = '200px';
               imgElement.style.maxHeight = '200px';
                messageContentDiv.appendChild(imgElement);
                 messageElement.appendChild(messageContentDiv);
                messageArea.appendChild(messageElement);
                messageArea.scrollTop = messageArea.scrollHeight;
           }
            if(text){
                messageElement = document.createElement('div');
                 messageElement.classList.add('message');
               if (sender === 'user') {
                    messageElement.classList.add('user-message');
                } else {
                    messageElement.classList.add('bot-message');
                }
                const messageContentDiv = document.createElement('div');
                messageContentDiv.innerHTML = ``;

               let formattedText = text.replace(/\n/g, "<br>");
                formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:black;\">$1</strong>");

                const messageParts = formattedText.split('*');
                messageParts.forEach((part, index) => {
                    const span = document.createElement("span");
                    if (index % 2 === 1) {
                        span.className = 'roleplay';
                        span.style.color = "#888";
                        span.style.color = "#888";
                    }
                    span.innerHTML = part;
                    messageContentDiv.appendChild(span);
                });
                messageElement.appendChild(messageContentDiv);
                messageArea.appendChild(messageElement);
                messageArea.scrollTop = messageArea.scrollHeight;
           }
            return messageElement;
        }
        function newChat() {
            messages = [];
            messageArea.innerHTML = '';
              if (currentCharacter) {
                    const key = `chat-history-${currentCharacter.id}`;
                    localStorage.removeItem(key);
                    initializeChatModel(currentCharacter);
                 }

        }
        function populateEditModal() {
            if (currentCharacter) {
                document.getElementById('editName').value = currentCharacter.name;
                document.getElementById('editPersonality').value = currentCharacter.personality;
                document.getElementById('editScenario').value = currentCharacter.scenario;
                document.getElementById('editGreeting').value = currentCharacter.greeting;
                editIndexInput.value = currentCharacter.id;

            }
        }

        async function generateImpersonatedResponse() {
          const apiKey = localStorage.getItem('apiKey') || apiKeyInput.value;
            if (!apiKey) {
                alert('Please enter API key first then refresh the page');
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                safetySettings: safetySettings
            });
             model.generationConfig = generationConfig;

            let impersonatePrompt = customImpersonateInstructionsInput.value || "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Don't write as {{char}} or system. Don't describe actions of {{char}}. ]";

            let chatHistoryText = "";
            messages.forEach(msg => {
                const sender = msg.sender === 'user' ? '{{user}}' : '{{char}}';
                chatHistoryText += `${sender}: ${msg.text}\n`;
            });

            impersonatePrompt = impersonatePrompt.replace("{{user}}", "User").replace("{{char}}", currentCharacter.name);

             let parts = [{text:`${chatHistoryText} \n ${impersonatePrompt}`}];

             messageInput.value = '';

            try {

                const result = await model.generateContentStream(parts);
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    messageInput.value += chunkText;
                }
                return 'success';

            } catch (error) {
                console.error("Error generating impersonated content:", error);
                alert("Failed to generate impersonated response due to PROHIBITED_CONTENT output");
                return 'error';
            }
        }
        async function generateBotResponse(userInput, lastBotMessageElement, image = null) {
           let loadingMessage = null;
            if (lastBotMessageElement) {
                lastBotMessageElement.querySelector("div").innerHTML = `Typing...`;
                loadingMessage = lastBotMessageElement;
            } else {
                loadingMessage = displayMessage('bot', "Typing...")
            }

            const apiKey = localStorage.getItem('apiKey') || apiKeyInput.value;
            if (!apiKey) {
                if (loadingMessage) {
                    loadingMessage.querySelector("div").textContent = 'Please enter API key first then refresh the page';
                } else {
                    displayMessage('bot', 'Please enter API key first then refresh the page')
                }

                return;
            }
            if (!chatModel) {
                if (loadingMessage) {
                     if(loadingMessage){
                          loadingMessage.querySelector("div").textContent = 'Chat model is not ready, please wait';
                     }
                } else {
                    displayMessage('bot', 'Chat model is not ready, please wait')
                }
                return 'error';
            }
            try {
                generationConfig.temperature = parseFloat(temperatureInput.value);
                generationConfig.topP = parseFloat(topPInput.value);
                generationConfig.topK = parseInt(topKInput.value);
                generationConfig.maxOutputTokens = parseInt(maxTokenInput.value);
                generationConfig.presencePenalty = parseFloat(presencePenaltyInput.value);
                generationConfig.frequencyPenalty = parseFloat(frequencyPenaltyInput.value);
                chatModel.generationConfig = generationConfig;
                 let parts = [];
                if (image) {
                    parts.push({
                         inlineData: {
                            data: image.data,
                            mimeType: image.mimeType,
                        },
                    });
                 }
                parts.push({text: userInput});
                const result = await chatModel.sendMessage(parts);
                const geminiResponse = await result.response;
                const geminiText = await geminiResponse.text();
                if (loadingMessage) {
                    loadingMessage.querySelector("div").innerHTML = "";
                    let text = geminiText
                    text = text.replace(/\n/g, "<br>");
                    text = text.replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:black;\">$1</strong>");
                    const messageParts = text.split('*');
                    messageParts.forEach((part, index) => {
                        const span = document.createElement("span");
                        if (index % 2 === 1) {
                            span.className = 'roleplay';
                            span.style.color = "#888";
                        span.style.color = "#888";
                        }
                        span.innerHTML = part;
                        loadingMessage.querySelector("div").appendChild(span);
                    });
                     messageArea.scrollTop = messageArea.scrollHeight;
                }else{
                       displayMessage(currentCharacter.name, geminiText)
                }

                return geminiText;
            } catch (error) {
                console.error("Error generating content:", error);
                if (loadingMessage) {
                     if(loadingMessage){
                          loadingMessage.querySelector("div").textContent = 'Failed to generate response, check console';
                     }
                } else {
                    displayMessage('bot', 'Failed to generate response, check console');
                }
                return 'error';
            }

        }
        function initializeChatModel(characterData) {
            const apiKey = localStorage.getItem('apiKey') || apiKeyInput.value;
            if (!apiKey) {
                displayMessage('bot', 'Please enter API key to continue')
                return;
            }
            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                 tools: [
    {'google_search': {}}, ],
                safetySettings: safetySettings
            });

            chatHistory = [];

            // Build the initial prompt
            let initialPrompt = `You will portray ${characterData.name} and engage in Roleplay with {{user}}.  ${customInstructionsInput.value} \n ${characterData.personality}. \n Scenario: ${characterData.scenario}.`;

            // Append lorebook content to the initial prompt
            if (characterData.lorebooks && characterData.lorebooks.length > 0) {
                initialPrompt += "\n\nThis is a lorebook, use this as guidance:\n";
                characterData.lorebooks.forEach((lorebook, index) => {
                    if (typeof lorebook === 'string') { // if it's not valid json
                      initialPrompt += `\nLorebook ${index + 1}:\n${lorebook}\n`;
                    }else{
                       initialPrompt += `\nLorebook ${index + 1}:\n${JSON.stringify(lorebook)}\n`;
                    }

                });
            }
            const prompt = {
                role: "user",
                parts: [{
                    text: initialPrompt
                }]
            };
            chatHistory.push(prompt);

            if(messages && messages.length > 0){
                 messages.forEach(message=>{
                     if(message.sender === 'user'){
                           if (message.image) {
                               chatHistory.push({
                                   role: 'user',
                                    parts: [
                                         {
                                              inlineData: {
                                                data: message.image.data,
                                                mimeType: message.image.mimeType
                                             }
                                        }
                                     ]
                               });
                           }
                         if(message.text){
                             chatHistory.push({
                                    role: "user",
                                    parts: [{
                                        text: message.text
                                    }]
                                });
                         }

                       }else{
                            if (message.image) {
                               chatHistory.push({
                                   role: 'model',
                                    parts: [
                                         {
                                              inlineData: {
                                                data: message.image.data,
                                                mimeType: message.image.mimeType
                                             }
                                        }
                                     ]
                               });
                           }
                         if(message.text){
                               chatHistory.push({
                                    role: "model",
                                    parts: [{
                                        text: message.text
                                    }]
                                });
                          }
                       }
                 })

            }
            generationConfig.temperature = parseFloat(temperatureInput.value);
            generationConfig.topP = parseFloat(topPInput.value);
            generationConfig.topK = parseInt(topKInput.value);
            generationConfig.maxOutputTokens = parseInt(maxTokenInput.value);
            generationConfig.presencePenalty = parseFloat(presencePenaltyInput.value);
            generationConfig.frequencyPenalty = parseFloat(frequencyPenaltyInput.value);

            chatModel = model.startChat({
                history: chatHistory,
                generationConfig: generationConfig
            });


         if(!messages || messages.length === 0){
            const greetingMessage = {
                role: "model",
                parts: [{
                    text: characterData.greeting
                }]
            };
             chatHistory.push(greetingMessage);
              displayMessage(currentCharacter.name, characterData.greeting);
           }



        }
        function removeLastBotMessage() {
            const lastMessage = messageArea.lastChild;
            if (lastMessage && lastMessage.classList.contains("bot-message")) {
                messageArea.removeChild(lastMessage);
            }
        }
        function getLastUserMessage() {
            const messages = messageArea.children;
             let lastUserMessage = '';
            for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].classList.contains("user-message") && messages[i].querySelector('img') == null ) {
                      lastUserMessage = messages[i].querySelector('div').textContent.trim();
                       return lastUserMessage;
                }
            }
            return lastUserMessage
        }
        function sendMessage() {
          const text = messageInput.value.trim();
           if (uploadedImage) {
                displayMessage('user', null, uploadedImage);
                messages.push({sender: "user", text: null, image: uploadedImage});
                 uploadBadge.style.display = 'inline-block';
           }
           if(text) {
                  displayMessage('user', text, null);
                  messages.push({ sender: "user", text: text, image: null });
           }
            messageInput.value = '';
            let botMessageElement = null;
            if(text || uploadedImage){
                botMessageElement = displayMessage('bot','Typing...');
            }
               generateBotResponse(text, botMessageElement, uploadedImage).then((botResponse) => {
                 if (botResponse !== 'error') {
                      messages.push({ sender: "bot", text: botResponse, image: null });
                      saveChatHistory();
                   }
                uploadedImage = null;
               uploadBadge.style.display = 'none';
             })

        }
        async function regenerateResponse() {
             const lastUserMessage = getLastUserMessage();
            if (lastUserMessage.trim() === '') {
                 return;
             }
             removeLastBotMessage();
             if (messages.length > 0 && messages[messages.length-1].sender === 'bot') {
                  messages.pop();
             }
             if (chatHistory.length > 1 && chatHistory[chatHistory.length-1].role === 'model'){
                   chatHistory.pop()
              }
             const botMessageElement = displayMessage('bot', "Generating...")
             generateBotResponse(lastUserMessage, botMessageElement).then((botResponse) => {
                   if (botResponse !== 'error') {
                    messages.push({ sender: "bot", text: botResponse , image: null });
                         saveChatHistory();
                   }
            })
        }

        async function saveEditCharacter() {
            const characterId = parseInt(editIndexInput.value); // Get the character ID

            const file = editProfilePicInput.files[0];
            let updatedCharacter = {};
            const lorebookInput = document.getElementById('editLorebook');
            const lorebookFiles = lorebookInput.files;
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
                            lorebooks.push(JSON.parse(fileContent));
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
            const lorebooks = await readLorebookFiles(lorebookFiles)

            if (file) {
                const reader = new FileReader();
                reader.onload = async function (e) {
                    updatedCharacter = {
                        id: characterId,
                        name: document.getElementById('editName').value,
                        personality: document.getElementById('editPersonality').value,
                        scenario: document.getElementById('editScenario').value,
                        greeting: document.getElementById('editGreeting').value,
                        profilePic: e.target.result,
                        lorebooks: lorebooks
                    };

                   await updateCharacterToDB(updatedCharacter); // Pass the entire object to updateCharacterToDB

                    editCharacterModal.style.display = 'none';
                    editCharacterForm.reset();
                    location.reload();
                };
                reader.readAsDataURL(file);
            } else {
                // No new profile pic, fetch existing character
                const existingCharacter = await getCharacterFromDB(characterId);

                updatedCharacter = {
                    id: characterId,
                    name: document.getElementById('editName').value,
                    personality: document.getElementById('editPersonality').value,
                    scenario: document.getElementById('editScenario').value,
                    greeting: document.getElementById('editGreeting').value,
                    profilePic: existingCharacter.profilePic, // Keep the old profile pic
                    lorebooks: lorebooks.length > 0 ? lorebooks : existingCharacter.lorebooks //use new lorebook if there is new, if not keep old
                };

                await updateCharacterToDB(updatedCharacter);  // Pass the entire object to updateCharacterToDB
                editCharacterModal.style.display = 'none';
                editCharacterForm.reset();
                location.reload();
            }
        }
        function saveChatToFile() {
            if (messages.length === 0) {
              alert("No chat history to save.");
              return;
            }
             const json = JSON.stringify(messages, null, 2);
             const blob = new Blob([json], { type: "application/json" });
             const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `chat_history_${currentCharacter.name}_${new Date().toISOString()}.json`;
            document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
        }
         function loadChatFromFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                 if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                         try{
                            const loadedMessages = JSON.parse(event.target.result);
                             if(Array.isArray(loadedMessages)){
                                   messages = loadedMessages;
                                   messageArea.innerHTML = '';
                                    messages.forEach(msg => displayMessage(msg.sender, msg.text, msg.image));
                                     saveChatHistory();
                                initializeChatModel(currentCharacter)

                             }else{
                                 alert("Invalid file format. Please upload a valid chat history json file.")
                             }
                         } catch(error){
                             alert("Error parsing file, make sure it's valid json file")
                         }
                    };
                   reader.readAsText(file)
                }
             }
            input.click();
        }
        uploadButton.addEventListener('click', () => {
            const input = document.createElement('input');
           input.type = 'file';
           input.accept = 'image/*';
           input.onchange = async (e) => {
                const file = e.target.files[0];
               if (file) {
                     const reader = new FileReader();
                   reader.onload = (event) => {
                       uploadedImage = {
                             data: event.target.result.split(',')[1],
                           mimeType: file.type,
                       }
                          uploadBadge.style.display = 'inline-block';

                   };
                  reader.readAsDataURL(file)
               }
           }
           input.click();
       });
        sendButton.addEventListener('click', sendMessage);
        regenerateButton.addEventListener('click', regenerateResponse)
        messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
            }
        });
        saveChatButton.addEventListener('click', saveChatToFile);
        loadChatButton.addEventListener('click', loadChatFromFile);
        settingsButton.addEventListener('click', () => {
            settingsDropdown.classList.toggle("show");
        });
        apiKeySettingButton.addEventListener('click', () => {
            settingsDropdown.classList.remove('show');
            apiKeyModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });
        generationSettingButton.addEventListener('click', () => {
            settingsDropdown.classList.remove('show');
            generationModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });
        newChatButton.addEventListener('click', () => {
            newChat();
            settingsDropdown.classList.remove('show');
        });
        characterEditorButton.addEventListener('click', () => {
            settingsDropdown.classList.remove('show');
            populateEditModal();
            editCharacterModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                apiKeyModal.style.display = 'none';
                generationModal.style.display = 'none';
                editCharacterModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            });
        });
        impersonateButton.addEventListener('click', async () => {
            const impersonatedText = await generateImpersonatedResponse();
           /* if (impersonatedText !== 'error') {
                messageInput.value = impersonatedText;
            }*/
        });

        window.addEventListener('resize', function () {
            const messageArea = document.getElementById('messageArea');
            if (window.innerHeight < 200) {
                messageArea.style.height = 'calc(100vh - 130px)';
            } else {
                messageArea.style.height = 'calc(100vh - 100px)';
            }
        });


        window.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
            if (!event.target.closest('.dropdown')) {
                settingsDropdown.classList.remove('show');
            }
            if (event.target === apiKeyModal) {
                apiKeyModal.style.display = 'none';
            }
            if (event.target === generationModal) {
                generationModal.style.display = 'none';
            }
            if (event.target === editCharacterModal) {
                editCharacterModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
        editCharacterForm.addEventListener('submit', function (event) {
            event.preventDefault();
            saveEditCharacter()
        });
        const storedApiKey = localStorage.getItem('apiKey');
        if (storedApiKey) {
            apiKeyInput.value = storedApiKey;
        }
        apiKeyInput.addEventListener('change', function () {
            localStorage.setItem('apiKey', this.value);
        });
        const storedMaxToken = localStorage.getItem('maxToken');
        if (storedMaxToken) {
            maxTokenInput.value = storedMaxToken;
        }
        maxTokenInput.addEventListener('change', function () {
            localStorage.setItem('maxToken', this.value);
        });
        temperatureInput.addEventListener('input', function () {
            temperatureValue.textContent = this.value;
        });
        presencePenaltyInput.addEventListener('input', function () {
            presencePenaltyValue.textContent = this.value;
        });
        frequencyPenaltyInput.addEventListener('input', function () {
            frequencyPenaltyValue.textContent = this.value;
        });
        topPInput.addEventListener('input', function () {
            topPValue.textContent = this.value;
        });
        applyButton.addEventListener('click', () => {
            localStorage.setItem('maxToken', maxTokenInput.value);
            localStorage.setItem('temperature', temperatureInput.value);
            localStorage.setItem('presencePenalty', presencePenaltyInput.value);
            localStorage.setItem('frequencyPenalty', frequencyPenaltyInput.value);
            localStorage.setItem('topP', topPInput.value);
            localStorage.setItem('topK', topKInput.value);
            localStorage.setItem('customInstructions', customInstructionsInput.value);
            localStorage.setItem('customImpersonateInstructions', customImpersonateInstructionsInput.value);
            generationModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        })
        const storedTemperature = localStorage.getItem('temperature');
        if (storedTemperature) {
            temperatureInput.value = storedTemperature;
            temperatureValue.textContent = storedTemperature;
        }
        const storedPresencePenalty = localStorage.getItem('presencePenalty');
        if (storedPresencePenalty) {
            presencePenaltyInput.value = storedPresencePenalty;
            presencePenaltyValue.textContent = storedPresencePenalty;
        }
        const storedFrequencyPenalty = localStorage.getItem('frequencyPenalty');
        if (storedFrequencyPenalty) {
            frequencyPenaltyInput.value = storedFrequencyPenalty;
            frequencyPenaltyValue.textContent = storedFrequencyPenalty;
        }
        const storedTopP = localStorage.getItem('topP');
        if (storedTopP) {
            topPInput.value = storedTopP;
            topPValue.textContent = storedTopP;
        }
        const storedTopK = localStorage.getItem('topK');
        if (storedTopK) {
            topKInput.value = storedTopK;
        }
        const storedCustomInstructions = localStorage.getItem('customInstructions');
        if (storedCustomInstructions) {
            customInstructionsInput.value = storedCustomInstructions;
        }
        const storedCustomImpersonateInstructions = localStorage.getItem('customImpersonateInstructions');
        if (storedCustomImpersonateInstructions) {
            customImpersonateInstructionsInput.value = storedCustomImpersonateInstructions;
        }
        await initIndexedDB();
        await loadCurrentCharacter();
        window.addEventListener('beforeunload', saveChatHistory);
    })();
});