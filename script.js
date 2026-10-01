/* =====================================================
   JARVIS MOBILE EDITION
   EPISODE 5 — MEMORY + THE EYES
   MASTER SCRIPT
   ===================================================== */


/* =====================================================
   CLOUDFLARE WORKER
   ===================================================== */

const WORKER_URL =
    "https://jarvis-api.vishnudutha8810.workers.dev";


/* =====================================================
   ELEMENTS
   ===================================================== */

const chat =
    document.getElementById("chat");

const input =
    document.getElementById("msg");

const sendButton =
    document.getElementById("send");

const micButton =
    document.getElementById("mic-btn");

const cameraButton =
    document.getElementById("cam-btn");

const clearButton =
    document.getElementById("clear-btn");

const imageInput =
    document.getElementById("img-input");


/* =====================================================
   MEMORY
   ===================================================== */

const MEMORY_KEY =
    "jarvis_memory";

let MEMORY = [];

try {

    MEMORY =
        JSON.parse(
            localStorage.getItem(MEMORY_KEY)
        ) || [];

} catch (error) {

    console.error(
        "Memory load error:",
        error
    );

    MEMORY = [];

}


/* =====================================================
   SAVE MEMORY
   ===================================================== */

function saveMemory() {

    try {

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(MEMORY)
        );

    } catch (error) {

        console.error(
            "Memory save error:",
            error
        );

    }

}


/* =====================================================
   ADD MEMORY
   ===================================================== */

function addMemory(role, text) {

    MEMORY.push({

        role: role,

        text: text,

        time: Date.now()

    });


    /*
       Keep latest 30 messages.
    */

    if (MEMORY.length > 30) {

        MEMORY =
            MEMORY.slice(-30);

    }


    saveMemory();

}


/* =====================================================
   MEMORY CONTEXT
   ===================================================== */

function getMemoryContext() {

    if (!MEMORY.length) {

        return "";

    }


    return MEMORY
        .map(function (item) {

            return (
                item.role.toUpperCase() +
                ": " +
                item.text
            );

        })
        .join("\n");

}


/* =====================================================
   CLEAR MEMORY
   ===================================================== */

if (clearButton) {

    clearButton.onclick =
        function () {

            const confirmed =
                confirm(
                    "Clear Jarvis memory?"
                );


            if (!confirmed) {

                return;

            }


            MEMORY = [];


            localStorage.removeItem(
                MEMORY_KEY
            );


            addMessage(
                "JARVIS: Memory cleared successfully, Boss.",
                "ai"
            );

        };

}


/* =====================================================
   CHAT MESSAGE
   ===================================================== */

function addMessage(text, type) {

    if (!chat) {

        return;

    }


    const message =
        document.createElement("div");


    message.className =
        "msg " + type;


    message.innerText =
        text;


    chat.appendChild(
        message
    );


    chat.scrollTop =
        chat.scrollHeight;

}


/* =====================================================
   PROCESSING
   ===================================================== */

let isProcessing = false;


/* =====================================================
   VOICE
   ===================================================== */

let availableVoices = [];

let selectedJarvisVoice = null;


/* =====================================================
   LOAD VOICES
   ===================================================== */

function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    availableVoices =
        speechSynthesis.getVoices();


    selectedJarvisVoice =
        findBestJarvisVoice();

}


/* =====================================================
   FIND JARVIS VOICE
   ===================================================== */

function findBestJarvisVoice() {

    if (!availableVoices.length) {

        return null;

    }


    const preferredNames = [

        "Google UK English Male",
        "Google US English",
        "Microsoft George",
        "Microsoft Ryan",
        "Microsoft Guy",
        "Microsoft Daniel",
        "Daniel",
        "Alex",
        "Arthur",
        "James"

    ];


    for (
        const preferredName
        of preferredNames
    ) {

        const voice =
            availableVoices.find(
                function (voice) {

                    return voice.name
                        .toLowerCase()
                        .includes(
                            preferredName
                                .toLowerCase()
                        );

                }
            );


        if (voice) {

            return voice;

        }

    }


    return (
        availableVoices.find(
            function (voice) {

                return voice.lang
                    .toLowerCase()
                    .startsWith("en");

            }
        ) || null
    );

}


/* =====================================================
   INITIALIZE VOICES
   ===================================================== */

loadVoices();


if (
    "speechSynthesis" in window
) {

    speechSynthesis.onvoiceschanged =
        function () {

            loadVoices();

        };

}


/* =====================================================
   CLEAN SPEECH TEXT
   ===================================================== */

function cleanForSpeech(text) {

    return text

        .replace(
            /\*\*(.*?)\*\*/g,
            "$1"
        )

        .replace(
            /\*(.*?)\*/g,
            "$1"
        )

        .replace(
            /`([^`]*)`/g,
            "$1"
        )

        .replace(
            /#+\s?/g,
            ""
        )

        .replace(
            /---+/g,
            ". "
        )

        .trim();

}


/* =====================================================
   SPEAK JARVIS
   ===================================================== */

function speakJarvis(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    if (!text) {

        return;

    }


    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            cleanForSpeech(text)
        );


    utterance.rate =
        0.94;


    utterance.pitch =
        0.90;


    utterance.volume =
        1.0;


    if (!selectedJarvisVoice) {

        selectedJarvisVoice =
            findBestJarvisVoice();

    }


    if (selectedJarvisVoice) {

        utterance.voice =
            selectedJarvisVoice;

        utterance.lang =
            selectedJarvisVoice.lang;

    } else {

        utterance.lang =
            "en-GB";

    }


    speechSynthesis.speak(
        utterance
    );

}


/* =====================================================
   ASK JARVIS
   ===================================================== */

async function askJarvis() {

    if (isProcessing) {

        return;

    }


    const userPrompt =
        input.value.trim();


    if (!userPrompt) {

        return;

    }


    isProcessing =
        true;


    sendButton.disabled =
        true;


    sendButton.textContent =
        "THINKING...";


    addMessage(
        "YOU: " + userPrompt,
        "user"
    );


    addMessage(
        "J.A.R.V.I.S: Processing...",
        "ai"
    );


    /*
       Save user message.
    */

    addMemory(
        "user",
        userPrompt
    );


    try {

        /*
           Build memory context.
        */

        const memoryContext =
            getMemoryContext();


        /*
           Send request to Worker.
        */

        const response =
            await fetch(
                WORKER_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            prompt:
                                userPrompt,

                            memory:
                                memoryContext

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Jarvis request failed."
            );

        }


        const jarvisReply =
            data.reply ||
            "Jarvis received no response.";


        /*
           Save assistant response.
        */

        addMemory(
            "assistant",
            jarvisReply
        );


        /*
           Replace processing message.
        */

        const messages =
            chat.querySelectorAll(
                ".msg.ai"
            );


        if (messages.length) {

            messages[
                messages.length - 1
            ].innerText =
                "J.A.R.V.I.S: " +
                jarvisReply;

        }


        /*
           Speak.
        */

        speakJarvis(
            jarvisReply
        );


        /*
           Clear input.
        */

        input.value =
            "";


    }
    catch (error) {

        console.error(
            "Jarvis error:",
            error
        );


        const messages =
            chat.querySelectorAll(
                ".msg.ai"
            );


        if (messages.length) {

            messages[
                messages.length - 1
            ].innerText =
                "J.A.R.V.I.S: Connection error — " +
                error.message;

        }

    }
    finally {

        isProcessing =
            false;


        sendButton.disabled =
            false;


        sendButton.textContent =
            "EXECUTE";

    }

}


/* =====================================================
   SEND BUTTON
   ===================================================== */

if (sendButton) {

    sendButton.onclick =
        function () {

            askJarvis();

        };

}


/* =====================================================
   ENTER KEY
   ===================================================== */

if (input) {

    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                askJarvis();

            }

        }
    );

}


/* =====================================================
   SPEECH RECOGNITION
   ===================================================== */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

let listening = false;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-IN";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onstart =
        function () {

            listening = true;

            if (micButton) {

                micButton.textContent =
                    "⏹";

            }

        };


    recognition.onresult =
        function (event) {

            const transcript =
                event.results[0][0]
                    .transcript;


            input.value =
                transcript;


            askJarvis();

        };


    recognition.onerror =
        function (event) {

            console.error(
                "Speech recognition error:",
                event.error
            );

            listening =
                false;


            if (micButton) {

                micButton.textContent =
                    "🎙";

            }

        };


    recognition.onend =
        function () {

            listening =
                false;


            if (micButton) {

                micButton.textContent =
                    "🎙";

            }

        };

}


/* =====================================================
   MIC BUTTON
   ===================================================== */

if (micButton) {

    micButton.onclick =
        function () {

            if (!recognition) {

                alert(
                    "Voice recognition is not supported in this browser."
                );

                return;

            }


            if (listening) {

                recognition.stop();

            } else {

                try {

                    recognition.start();

                }
                catch (error) {

                    console.error(
                        "Voice start error:",
                        error
                    );

                }

            }

        };

}


/* =====================================================
   CAMERA BUTTON
   ===================================================== */

if (
    cameraButton &&
    imageInput
) {

    cameraButton.onclick =
        function () {

            imageInput.click();

        };

}


/* =====================================================
   IMAGE SELECTED
   ===================================================== */

if (imageInput) {

    imageInput.addEventListener(
        "change",
        async function () {

            const file =
                imageInput.files[0];


            if (!file) {

                return;

            }


            addMessage(
                "J.A.R.V.I.S: Image selected. Preparing vision analysis...",
                "ai"
            );


            try {

                const base64 =
                    await fileToBase64(
                        file
                    );


                window.jarvisVisionImage = {

                    name:
                        file.name,

                    type:
                        file.type,

                    base64:
                        base64.split(",")[1]

                };


                addMessage(
                    "J.A.R.V.I.S: Image ready for Jarvis Vision.",
                    "ai"
                );


                /*
                   The actual Gemini Vision request
                   requires the Worker to accept
                   image data. We will connect that
                   after the basic chat test passes.
                */

            }
            catch (error) {

                addMessage(
                    "J.A.R.V.I.S: Image processing error — " +
                    error.message,
                    "ai"
                );

            }


            imageInput.value =
                "";

        }
    );

}


/* =====================================================
   FILE TO BASE64
   ===================================================== */

function fileToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Could not read image."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =====================================================
   STARTUP
   ===================================================== */

addMessage(
    "J.A.R.V.I.S: Systems online. Awaiting your command, Boss.",
    "ai"
);
